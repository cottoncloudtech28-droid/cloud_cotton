const router = require("express").Router();
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const StockLog = require("../models/StockLog");
const { verifyToken, requireAdmin } = require("../middleware/auth");

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

// Parse composite cart ID: "realMongoId::size::color" → { productId, size, color }
function parseCartId(raw) {
  const parts = raw.split("::");
  return {
    productId: parts[0],
    size:  parts[1] ?? null,
    color: parts[2] ?? null,
  };
}

// POST /api/orders  — place order (authenticated)
router.post("/", verifyToken, async (req, res) => {
  const { items, address, total } = req.body;
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: "Order must have at least one item" });
  if (!address?.fullName || !address?.phone || !address?.line1 || !address?.city || !address?.state || !address?.pincode)
    return res.status(400).json({ message: "Complete shipping address is required" });

  // ── Resolve real product IDs and check stock ─────────────────────────────
  const resolved = [];
  for (const item of items) {
    const { productId, size, color } = parseCartId(item.productId ?? "");
    if (!mongoose.isValidObjectId(productId))
      return res.status(400).json({ message: `Invalid product ID: ${item.productId}` });

    const product = await Product.findById(productId);
    if (!product)
      return res.status(400).json({ message: `Product not found: ${item.name}` });

    // Determine available stock for the requested variant
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
      return res.status(400).json({
        message: `"${product.name}${variantLabel}" only has ${availableStock} in stock — you requested ${item.qty}`,
      });
    }

    resolved.push({ product, size, color, item, targetSizeIndex });
  }

  // ── Normalize items for storage ──────────────────────────────────────────
  const normalizedItems = resolved.map(({ product, size, color, item }) => ({
    productId: product._id.toString(),
    name:      item.name,
    image_url: item.image_url ?? product.image_url ?? null,
    price:     item.price ?? product.price,
    discount_percent: item.discount_percent ?? product.discount_percent ?? 0,
    qty:   item.qty,
    color: color ?? item.color ?? null,
    size:  size ?? item.size ?? null,
  }));

  // ── Create order ─────────────────────────────────────────────────────────
  let order;
  try {
    order = await Order.create({
      user: req.user.userId,
      items: normalizedItems,
      address,
      total,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }

  // ── Decrement stock + log (best-effort, non-blocking) ────────────────────
  for (const { product, size, item, targetSizeIndex } of resolved) {
    try {
      let stockBefore, stockAfter;

      if (targetSizeIndex >= 0) {
        // Variant-level decrement
        stockBefore = product.sizes[targetSizeIndex].stock;
        product.sizes[targetSizeIndex].stock = Math.max(0, stockBefore - item.qty);
        stockAfter = product.sizes[targetSizeIndex].stock;
        // Sync total stock
        product.stock = product.sizes.reduce((s, sz) => s + sz.stock, 0);
        product.markModified("sizes");
      } else {
        // Flat stock decrement
        stockBefore = product.stock;
        product.stock = Math.max(0, stockBefore - item.qty);
        stockAfter = product.stock;
      }

      await product.save({ validateBeforeSave: false });

      await StockLog.create({
        product:     product._id,
        productName: product.name,
        sku:         product.sku ?? null,
        size:        size ?? null,
        change:      -(item.qty),
        stockBefore,
        stockAfter,
        reason:      "order",
        orderId:     order.orderId,
        performedBy: req.user.userId,
      });
    } catch (_) {
      // Don't fail the order if stock update fails — log silently
    }
  }

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

// PATCH /api/orders/:id/status  — admin: update order status
router.patch("/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const VALID = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  const { status } = req.body;
  if (!VALID.includes(status)) return res.status(400).json({ message: "Invalid status value" });
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(mapOrder(order));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
