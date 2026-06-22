const router = require("express").Router();
const crypto = require("crypto");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const StockLog = require("../models/StockLog");
const { verifyToken, requireAdmin } = require("../middleware/auth");
const sr = require("../services/shiprocket");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const mapOrder = (doc) => {
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  if (obj.user && obj.user._id) {
    obj.user = { id: obj.user._id.toString(), email: obj.user.email, name: obj.user.name };
  } else if (obj.user) {
    obj.user = obj.user.toString();
  }
  return obj;
};

// Non-blocking Shiprocket auto-push; called after order creation
async function tryAutoPushShiprocket(order, userId) {
  if (!process.env.SHIPROCKET_EMAIL) return;
  try {
    const user = await User.findById(userId).select("email").lean();
    const result = await sr.pushOrder(order, user?.email);
    await Order.findByIdAndUpdate(order._id, {
      shiprocket_order_id:    result.shiprocket_order_id,
      shiprocket_shipment_id: result.shiprocket_shipment_id,
      awb_code:               result.awb_code,
      courier_name:           result.courier_name,
      ...(result.awb_code ? { trackingNumber: result.awb_code } : {}),
    });
  } catch (_) { /* fail silently — admin can manually push */ }
}

// Parse composite cart ID: "realMongoId::size::color" → { productId, size, color }
function parseCartId(raw) {
  const parts = raw.split("::");
  return { productId: parts[0], size: parts[1] ?? null, color: parts[2] ?? null };
}

// Resolve items → check stock → return resolved array (throws on failure)
async function resolveItems(items) {
  const resolved = [];
  for (const item of items) {
    const { productId, size, color } = parseCartId(item.productId ?? "");
    if (!mongoose.isValidObjectId(productId))
      throw { status: 400, message: `Invalid product ID: ${item.productId}` };

    const product = await Product.findById(productId);
    if (!product)
      throw { status: 400, message: `Product not found: ${item.name}` };

    let availableStock;
    let targetSizeIndex = -1;

    if (product.sizes && product.sizes.length > 0 && size) {
      targetSizeIndex = product.sizes.findIndex((sz) => sz.label === size);
      availableStock = targetSizeIndex >= 0 ? product.sizes[targetSizeIndex].stock : 0;
    } else {
      availableStock = product.stock;
    }

    if (availableStock < item.qty) {
      const variantLabel = size ? ` (${size})` : "";
      throw {
        status: 400,
        message: `"${product.name}${variantLabel}" only has ${availableStock} in stock — you requested ${item.qty}`,
      };
    }

    resolved.push({ product, size, color, item, targetSizeIndex });
  }
  return resolved;
}

function normalizeItems(resolved) {
  return resolved.map(({ product, size, color, item }) => ({
    productId: product._id.toString(),
    name: item.name,
    image_url: item.image_url ?? product.image_url ?? null,
    price: item.price ?? product.price,
    discount_percent: item.discount_percent ?? product.discount_percent ?? 0,
    qty: item.qty,
    color: color ?? item.color ?? null,
    size: size ?? item.size ?? null,
  }));
}

async function decrementStock(resolved, order, userId) {
  for (const { product, size, item, targetSizeIndex } of resolved) {
    try {
      let stockBefore, stockAfter;

      if (targetSizeIndex >= 0) {
        stockBefore = product.sizes[targetSizeIndex].stock;
        product.sizes[targetSizeIndex].stock = Math.max(0, stockBefore - item.qty);
        stockAfter = product.sizes[targetSizeIndex].stock;
        product.stock = product.sizes.reduce((s, sz) => s + sz.stock, 0);
        product.markModified("sizes");
      } else {
        stockBefore = product.stock;
        product.stock = Math.max(0, stockBefore - item.qty);
        stockAfter = product.stock;
      }

      await product.save({ validateBeforeSave: false });

      await StockLog.create({
        product: product._id,
        productName: product.name,
        sku: product.sku ?? null,
        size: size ?? null,
        change: -(item.qty),
        stockBefore,
        stockAfter,
        reason: "order",
        orderId: order.orderId,
        performedBy: userId,
      });
    } catch (_) {
      // Non-blocking — don't fail the order if stock logging fails
    }
  }
}

// POST /api/orders  — place COD order (authenticated)
router.post("/", verifyToken, async (req, res) => {
  const { items, address, total } = req.body;
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: "Order must have at least one item" });
  if (!address?.fullName || !address?.phone || !address?.line1 || !address?.city || !address?.state || !address?.pincode)
    return res.status(400).json({ message: "Complete shipping address is required" });

  let resolved;
  try {
    resolved = await resolveItems(items);
  } catch (e) {
    return res.status(e.status || 400).json({ message: e.message });
  }

  const normalizedItems = normalizeItems(resolved);

  let order;
  try {
    order = await Order.create({
      user: req.user.userId,
      items: normalizedItems,
      address,
      total,
      payment_method: "cod",
      payment_status: "pending",
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }

  await decrementStock(resolved, order, req.user.userId);
  tryAutoPushShiprocket(order, req.user.userId); // fire-and-forget
  res.status(201).json(mapOrder(order));
});

// POST /api/orders/razorpay/create-order  — create Razorpay payment order
router.post("/razorpay/create-order", verifyToken, async (req, res) => {
  const { amount } = req.body; // in rupees
  if (!amount || Number(amount) <= 0)
    return res.status(400).json({ message: "Invalid amount" });

  try {
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100), // convert to paise
      currency: "INR",
      receipt: "kcs_" + Date.now().toString(36),
    });
    res.json({
      razorpay_order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (e) {
    res.status(500).json({ message: e.message || "Failed to create payment order" });
  }
});

// POST /api/orders/razorpay/verify  — verify Razorpay payment + create DB order
router.post("/razorpay/verify", verifyToken, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, address, total } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    return res.status(400).json({ message: "Missing payment verification fields" });
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: "Order must have at least one item" });
  if (!address?.fullName || !address?.phone || !address?.line1 || !address?.city || !address?.state || !address?.pincode)
    return res.status(400).json({ message: "Complete shipping address is required" });

  // Verify Razorpay signature
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature)
    return res.status(400).json({ message: "Payment verification failed. Invalid signature." });

  let resolved;
  try {
    resolved = await resolveItems(items);
  } catch (e) {
    return res.status(e.status || 400).json({ message: e.message });
  }

  const normalizedItems = normalizeItems(resolved);

  let order;
  try {
    order = await Order.create({
      user: req.user.userId,
      items: normalizedItems,
      address,
      total,
      payment_method: "razorpay",
      payment_status: "paid",
      razorpay_order_id,
      razorpay_payment_id,
      status: "confirmed",
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }

  await decrementStock(resolved, order, req.user.userId);
  tryAutoPushShiprocket(order, req.user.userId); // fire-and-forget
  res.status(201).json(mapOrder(order));
});

// GET /api/orders  — authenticated user's own orders
router.get("/", verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.userId }).sort({ createdAt: -1 });
    res.json(orders.map(mapOrder));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/orders/all  — admin: all orders with user info
router.get("/all", verifyToken, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate("user", "email name");
    res.json(orders.map(mapOrder));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/orders/analytics  — admin: aggregate sales data for dashboard
router.get("/analytics", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { days = "30" } = req.query;
    const daysNum = Math.min(365, Math.max(7, parseInt(days) || 30));
    const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    const allOrders = await Order.find({ status: { $ne: "cancelled" } }).sort({ createdAt: 1 });
    const recentOrders = allOrders.filter((o) => o.createdAt >= since);

    // Daily revenue for line chart
    const dailyMap = {};
    for (let i = 0; i < daysNum; i++) {
      const d = new Date(Date.now() - (daysNum - 1 - i) * 24 * 60 * 60 * 1000);
      dailyMap[d.toISOString().slice(0, 10)] = 0;
    }
    recentOrders.forEach((o) => {
      const key = o.createdAt.toISOString().slice(0, 10);
      if (key in dailyMap) dailyMap[key] += o.total;
    });
    const dailyRevenue = Object.entries(dailyMap).map(([date, revenue]) => ({ date, revenue }));

    // Category breakdown
    const categoryMap = {};
    allOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const cat = item.category ?? "unknown";
        categoryMap[cat] = (categoryMap[cat] || 0) + item.price * (1 - (item.discount_percent || 0) / 100) * item.qty;
      });
    });
    const byCategory = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Top products
    const productMap = {};
    allOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const key = item.productId?.toString() ?? item.name;
        if (!productMap[key]) productMap[key] = { name: item.name, revenue: 0, qty: 0 };
        productMap[key].revenue += item.price * (1 - (item.discount_percent || 0) / 100) * item.qty;
        productMap[key].qty += item.qty;
      });
    });
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((p) => ({ ...p, revenue: Math.round(p.revenue) }));

    // Status counts (all time)
    const statusCounts = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Summary stats
    const totalRevenue = allOrders.reduce((s, o) => s + o.total, 0);
    const recentRevenue = recentOrders.reduce((s, o) => s + o.total, 0);
    const avgOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.length : 0;

    res.json({
      summary: {
        totalOrders: allOrders.length,
        totalRevenue: Math.round(totalRevenue),
        recentRevenue: Math.round(recentRevenue),
        avgOrderValue: Math.round(avgOrderValue),
        recentOrderCount: recentOrders.length,
        daysNum,
      },
      dailyRevenue,
      byCategory,
      topProducts,
      statusCounts: statusCounts.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/orders/track/:orderId  — public: look up an order by its human-readable ID
router.get("/track/:orderId", async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ message: "Order not found. Check the order ID and try again." });

    // Return limited public info only
    res.json({
      orderId:     order.orderId,
      status:      order.status,
      trackingNumber: order.trackingNumber ?? null,
      cancelReason:   order.cancelReason ?? null,
      payment_method: order.payment_method,
      createdAt:   order.createdAt,
      updatedAt:   order.updatedAt,
      address: {
        city:    order.address.city,
        state:   order.address.state,
        pincode: order.address.pincode,
      },
      items: order.items.map((item) => ({
        name:      item.name,
        image_url: item.image_url,
        qty:       item.qty,
        size:      item.size,
        color:     item.color,
      })),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/orders/:id/cancel  — authenticated user: cancel own pending order
router.post("/:id/cancel", verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.user.toString() !== req.user.userId)
      return res.status(403).json({ message: "You can only cancel your own orders" });
    if (!["pending", "confirmed"].includes(order.status))
      return res.status(400).json({ message: `Orders with status "${order.status}" cannot be cancelled` });

    const { reason } = req.body;
    order.status = "cancelled";
    order.cancelledBy = "customer";
    order.cancelReason = reason || null;
    await order.save();

    // Restore stock (non-blocking)
    for (const item of order.items) {
      try {
        const product = await Product.findById(item.productId);
        if (!product) continue;

        let stockBefore, stockAfter;
        if (item.size && product.sizes && product.sizes.length > 0) {
          const idx = product.sizes.findIndex((sz) => sz.label === item.size);
          if (idx >= 0) {
            stockBefore = product.sizes[idx].stock;
            product.sizes[idx].stock += item.qty;
            stockAfter = product.sizes[idx].stock;
            product.stock = product.sizes.reduce((s, sz) => s + sz.stock, 0);
            product.markModified("sizes");
          } else {
            stockBefore = product.stock; product.stock += item.qty; stockAfter = product.stock;
          }
        } else {
          stockBefore = product.stock; product.stock += item.qty; stockAfter = product.stock;
        }
        await product.save({ validateBeforeSave: false });
        await StockLog.create({
          product: product._id, productName: product.name, sku: product.sku ?? null,
          size: item.size ?? null, change: item.qty, stockBefore, stockAfter,
          reason: "cancellation", orderId: order.orderId,
          note: `Customer cancelled: ${reason || "No reason given"}`,
          performedBy: req.user.userId,
        });
      } catch (_) {}
    }

    res.json(mapOrder(order));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/orders/:id/tracking  — admin: set tracking number
router.patch("/:id/tracking", verifyToken, requireAdmin, async (req, res) => {
  const { trackingNumber } = req.body;
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { trackingNumber: trackingNumber || null },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(mapOrder(order));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/orders/:id/status  — admin: update order status (restores stock on cancellation)
router.patch("/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const VALID = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  const { status } = req.body;
  if (!VALID.includes(status)) return res.status(400).json({ message: "Invalid status value" });

  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const oldStatus = order.status;
    order.status = status;
    await order.save();

    // Restore stock when an order transitions to cancelled
    if (status === "cancelled" && oldStatus !== "cancelled") {
      for (const item of order.items) {
        try {
          const product = await Product.findById(item.productId);
          if (!product) continue;

          let stockBefore, stockAfter;

          if (item.size && product.sizes && product.sizes.length > 0) {
            const idx = product.sizes.findIndex((sz) => sz.label === item.size);
            if (idx >= 0) {
              stockBefore = product.sizes[idx].stock;
              product.sizes[idx].stock += item.qty;
              stockAfter = product.sizes[idx].stock;
              product.stock = product.sizes.reduce((s, sz) => s + sz.stock, 0);
              product.markModified("sizes");
            } else {
              stockBefore = product.stock;
              product.stock += item.qty;
              stockAfter = product.stock;
            }
          } else {
            stockBefore = product.stock;
            product.stock += item.qty;
            stockAfter = product.stock;
          }

          await product.save({ validateBeforeSave: false });

          await StockLog.create({
            product:     product._id,
            productName: product.name,
            sku:         product.sku ?? null,
            size:        item.size ?? null,
            change:      item.qty,
            stockBefore,
            stockAfter,
            reason:      "cancellation",
            orderId:     order.orderId,
            note:        `Cancelled: ${order.orderId}`,
            performedBy: req.user.userId,
          });
        } catch (_) {
          // Non-blocking — don't fail the status update if stock restore fails
        }
      }
    }

    res.json(mapOrder(order));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
