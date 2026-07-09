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
const { sendOrderConfirmationEmail, sendAdminOrderNotification } = require("../lib/mailer");

let _razorpay = null;
function getRazorpay() {
  if (!_razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
      throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not configured");
    _razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  }
  return _razorpay;
}

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

// Non-blocking order emails; called after order creation
async function sendOrderEmails(order, userId) {
  try {
    const user = await User.findById(userId).select("email").lean();
    await Promise.allSettled([
      sendOrderConfirmationEmail(order, user?.email),
      sendAdminOrderNotification(order, user?.email),
    ]);
  } catch (_) { /* fail silently — email is a courtesy, not order-critical */ }
}

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

// Parse composite cart ID: "realMongoId::s=size::c=color::ch=character" → { productId, size, color, character }
// Segments are key-prefixed (not positional) so any subset of size/color/character
// can be present without the others being misread — e.g. a color-only product's
// "id::c=Pink" isn't mistaken for a size.
function parseCartId(raw) {
  const [productId, ...rest] = raw.split("::");
  let size = null, color = null, character = null;
  for (const part of rest) {
    if (part.startsWith("ch=")) character = part.slice(3);
    else if (part.startsWith("s=")) size = part.slice(2);
    else if (part.startsWith("c=")) color = part.slice(2);
  }
  return { productId, size, color, character };
}

// Compute GST breakdown from normalized items + buyer/seller state
// Prices are GST-inclusive; we back-calculate taxable value
function computeGstBreakdown(normalizedItems, sellerState, buyerState) {
  const isInterstate = sellerState && buyerState && sellerState.toLowerCase() !== buyerState.toLowerCase();
  let totalTaxable = 0;
  let totalTax = 0;

  for (const item of normalizedItems) {
    const rate = item.gst_rate || 12;
    const finalPrice = +(item.price * (1 - item.discount_percent / 100)).toFixed(2);
    const lineTotal = +(finalPrice * item.qty).toFixed(2);
    const taxable = +(lineTotal / (1 + rate / 100)).toFixed(2);
    totalTaxable += taxable;
    totalTax += +(lineTotal - taxable).toFixed(2);
  }

  totalTaxable = +totalTaxable.toFixed(2);
  totalTax = +totalTax.toFixed(2);

  if (isInterstate) {
    return {
      taxable_value: totalTaxable,
      cgst_rate: 0, sgst_rate: 0, igst_rate: 18,
      cgst_amount: 0, sgst_amount: 0,
      igst_amount: totalTax,
      total_tax: totalTax,
      is_interstate: true,
    };
  }
  const half = +(totalTax / 2).toFixed(2);
  return {
    taxable_value: totalTaxable,
    cgst_rate: 9, sgst_rate: 9, igst_rate: 0,
    cgst_amount: half, sgst_amount: +(totalTax - half).toFixed(2),
    igst_amount: 0,
    total_tax: totalTax,
    is_interstate: false,
  };
}

// Resolve items → check stock → return resolved array (throws on failure)
async function resolveItems(items) {
  const resolved = [];
  for (const item of items) {
    const { productId, size, color, character } = parseCartId(item.productId ?? "");
    if (!mongoose.isValidObjectId(productId))
      throw { status: 400, message: `Invalid product ID: ${item.productId}` };

    const product = await Product.findById(productId);
    if (!product)
      throw { status: 400, message: `Product not found: ${item.name}` };

    const useSize = !!(product.sizes && product.sizes.length > 0 && size);
    const useColor = !!(product.colors && product.colors.length > 0 && color);
    const useCharacter = !!(product.characters && product.characters.length > 0 && character);
    const targetSizeIndex = useSize ? product.sizes.findIndex((sz) => sz.label === size) : -1;
    const targetColorIndex = useColor ? product.colors.findIndex((c) => c.label === color) : -1;
    const targetCharacterIndex = useCharacter ? product.characters.findIndex((c) => c.label === character) : -1;

    const sizeStock = useSize ? (targetSizeIndex >= 0 ? product.sizes[targetSizeIndex].stock : 0) : null;
    const colorStock = useColor ? (targetColorIndex >= 0 ? product.colors[targetColorIndex].stock : 0) : null;
    const characterStock = useCharacter ? (targetCharacterIndex >= 0 ? product.characters[targetCharacterIndex].stock : 0) : null;

    // Most-restrictive-wins: when multiple variant axes are selected, the smallest governs.
    const stocks = [sizeStock, colorStock, characterStock].filter((s) => s !== null);
    const availableStock = stocks.length > 0 ? Math.min(...stocks) : product.stock;

    if (availableStock < item.qty) {
      const variantParts = [size, color, character].filter(Boolean);
      const variantLabel = variantParts.length ? ` (${variantParts.join(", ")})` : "";
      throw {
        status: 400,
        message: `"${product.name}${variantLabel}" only has ${availableStock} in stock — you requested ${item.qty}`,
      };
    }

    resolved.push({ product, size, color, character, item, targetSizeIndex, targetColorIndex, targetCharacterIndex });
  }
  return resolved;
}

// Adjust a product's size/color/character variant stock (tracked independently — not a
// combined matrix), recompute the flat total, save, and write one StockLog row per variant
// dimension that actually changed. delta > 0 restores stock, delta < 0 deducts it.
async function adjustVariantStock(product, { size, color, character }, delta, { reason, orderId = null, note = null, performedBy }) {
  const logs = [];

  const sizeIdx = size && product.sizes?.length ? product.sizes.findIndex((sz) => sz.label === size) : -1;
  if (sizeIdx >= 0) {
    const before = product.sizes[sizeIdx].stock;
    product.sizes[sizeIdx].stock = Math.max(0, before + delta);
    logs.push({ size, color: null, character: null, stockBefore: before, stockAfter: product.sizes[sizeIdx].stock });
    product.markModified("sizes");
  }

  const colorIdx = color && product.colors?.length ? product.colors.findIndex((c) => c.label === color) : -1;
  if (colorIdx >= 0) {
    const before = product.colors[colorIdx].stock;
    product.colors[colorIdx].stock = Math.max(0, before + delta);
    logs.push({ size: null, color, character: null, stockBefore: before, stockAfter: product.colors[colorIdx].stock });
    product.markModified("colors");
  }

  const characterIdx = character && product.characters?.length ? product.characters.findIndex((c) => c.label === character) : -1;
  if (characterIdx >= 0) {
    const before = product.characters[characterIdx].stock;
    product.characters[characterIdx].stock = Math.max(0, before + delta);
    logs.push({ size: null, color: null, character, stockBefore: before, stockAfter: product.characters[characterIdx].stock });
    product.markModified("characters");
  }

  if (sizeIdx < 0 && colorIdx < 0 && characterIdx < 0) {
    const before = product.stock;
    product.stock = Math.max(0, before + delta);
    logs.push({ size: null, color: null, character: null, stockBefore: before, stockAfter: product.stock });
  } else if (product.sizes && product.sizes.length > 0) {
    product.stock = product.sizes.reduce((s, sz) => s + sz.stock, 0);
  } else if (product.colors && product.colors.length > 0) {
    product.stock = product.colors.reduce((s, c) => s + c.stock, 0);
  } else if (product.characters && product.characters.length > 0) {
    product.stock = product.characters.reduce((s, c) => s + c.stock, 0);
  }

  await product.save({ validateBeforeSave: false });

  for (const log of logs) {
    await StockLog.create({
      product: product._id,
      productName: product.name,
      sku: product.sku ?? null,
      size: log.size,
      color: log.color,
      character: log.character,
      change: log.stockAfter - log.stockBefore,
      stockBefore: log.stockBefore,
      stockAfter: log.stockAfter,
      reason,
      orderId,
      note,
      performedBy,
    });
  }
}

function normalizeItems(resolved) {
  return resolved.map(({ product, size, color, character, item }) => ({
    productId: product._id.toString(),
    name: item.name,
    image_url: item.image_url ?? product.image_url ?? null,
    price: item.price ?? product.price,
    discount_percent: item.discount_percent ?? product.discount_percent ?? 0,
    qty: item.qty,
    color: color ?? item.color ?? null,
    character: character ?? item.character ?? null,
    size: size ?? item.size ?? null,
    hsn_code: product.hsn_code ?? null,
    gst_rate: product.gst_rate ?? 12,
  }));
}

async function decrementStock(resolved, order, userId) {
  for (const { product, size, color, character, item } of resolved) {
    try {
      await adjustVariantStock(product, { size, color, character }, -item.qty, {
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
  const { items, address, total, shipping_charge = 0 } = req.body;
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
  const Settings = require("../models/Settings");
  const gstCfg = await Settings.findOne({ key: "gst" }).lean();
  const sellerState = gstCfg?.value?.state || "";
  const gst_breakdown = computeGstBreakdown(normalizedItems, sellerState, address.state);

  let order;
  try {
    order = await Order.create({
      user: req.user.userId,
      items: normalizedItems,
      address,
      total,
      shipping_charge: Math.round(Number(shipping_charge) || 0),
      payment_method: "cod",
      payment_status: "pending",
      gst_breakdown,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }

  await decrementStock(resolved, order, req.user.userId);
  tryAutoPushShiprocket(order, req.user.userId); // fire-and-forget
  sendOrderEmails(order, req.user.userId); // fire-and-forget
  res.status(201).json(mapOrder(order));
});

// POST /api/orders/razorpay/create-order  — create Razorpay payment order
router.post("/razorpay/create-order", verifyToken, async (req, res) => {
  const { amount } = req.body; // in rupees
  if (!amount || Number(amount) <= 0)
    return res.status(400).json({ message: "Invalid amount" });

  try {
    const rzpOrder = await getRazorpay().orders.create({
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
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, address, total, shipping_charge = 0 } = req.body;

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
  const SettingsRzp = require("../models/Settings");
  const gstCfgRzp = await SettingsRzp.findOne({ key: "gst" }).lean();
  const sellerStateRzp = gstCfgRzp?.value?.state || "";
  const gst_breakdown_rzp = computeGstBreakdown(normalizedItems, sellerStateRzp, address.state);

  let order;
  try {
    order = await Order.create({
      user: req.user.userId,
      items: normalizedItems,
      address,
      total,
      shipping_charge: Math.round(Number(shipping_charge) || 0),
      payment_method: "razorpay",
      payment_status: "paid",
      razorpay_order_id,
      razorpay_payment_id,
      status: "confirmed",
      gst_breakdown: gst_breakdown_rzp,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }

  await decrementStock(resolved, order, req.user.userId);
  tryAutoPushShiprocket(order, req.user.userId); // fire-and-forget
  sendOrderEmails(order, req.user.userId); // fire-and-forget
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
        character: item.character,
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
    if (order.shiprocket_order_id)
      return res.status(400).json({ message: "This order has already been dispatched via Shiprocket and cannot be cancelled. Please contact us for help." });

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

        await adjustVariantStock(product, { size: item.size, color: item.color, character: item.character }, item.qty, {
          reason: "cancellation",
          orderId: order.orderId,
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

          await adjustVariantStock(product, { size: item.size, color: item.color, character: item.character }, item.qty, {
            reason: "cancellation",
            orderId: order.orderId,
            note: `Cancelled: ${order.orderId}`,
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

// GET /api/orders/:id/invoice  — owner or admin: full invoice data
router.get("/:id/invoice", verifyToken, async (req, res) => {
  try {
    const Settings = require("../models/Settings");
    const order = await Order.findById(req.params.id)
      .populate("user", "email name")
      .lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    const isOwner = order.user && order.user._id && order.user._id.toString() === req.user.userId;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) return res.status(403).json({ message: "Forbidden" });

    const gstSettings = await Settings.findOne({ key: "gst" }).lean();
    res.json({ order: mapOrder({ toObject: () => order, ...order }), gstSettings: gstSettings?.value ?? {} });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/orders/admin/gstr1-export?from=YYYY-MM-DD&to=YYYY-MM-DD  — admin: CSV for GSTR-1
router.get("/admin/gstr1-export", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { status: { $ne: "cancelled" } };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    const orders = await Order.find(filter).populate("user", "email name").lean();

    const rows = [
      ["Invoice No", "Invoice Date", "Customer Name", "Customer GSTIN", "Place of Supply",
       "Taxable Value", "CGST Rate", "CGST Amt", "SGST Rate", "SGST Amt",
       "IGST Rate", "IGST Amt", "Total Tax", "Invoice Value", "Payment Mode"].join(",")
    ];

    for (const o of orders) {
      const gst = o.gst_breakdown || {};
      const date = new Date(o.createdAt).toLocaleDateString("en-IN");
      const name = (o.user?.name || o.address?.fullName || "").replace(/,/g, " ");
      rows.push([
        o.invoice_number || o.orderId,
        date,
        name,
        o.buyer_gstin || "",
        o.address?.state || "",
        (gst.taxable_value || 0).toFixed(2),
        (gst.cgst_rate || 0),
        (gst.cgst_amount || 0).toFixed(2),
        (gst.sgst_rate || 0),
        (gst.sgst_amount || 0).toFixed(2),
        (gst.igst_rate || 0),
        (gst.igst_amount || 0).toFixed(2),
        (gst.total_tax || 0).toFixed(2),
        (o.total || 0).toFixed(2),
        o.payment_method || "cod",
      ].join(","));
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="GSTR1_export_${Date.now()}.csv"`);
    res.send(rows.join("\n"));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
