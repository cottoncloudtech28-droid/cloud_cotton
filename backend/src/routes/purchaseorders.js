const router = require("express").Router();
const PurchaseOrder = require("../models/PurchaseOrder");
const Product = require("../models/Product");
const StockLog = require("../models/StockLog");
const { verifyToken, requireAdmin } = require("../middleware/auth");

const mapPO = (doc) => {
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  if (obj.supplier?._id) {
    obj.supplier = { id: obj.supplier._id.toString(), name: obj.supplier.name };
  } else if (obj.supplier) {
    obj.supplier = obj.supplier.toString();
  }
  return obj;
};

// GET /api/purchase-orders
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const pos = await PurchaseOrder.find()
      .populate("supplier", "name")
      .sort({ createdAt: -1 });
    res.json(pos.map(mapPO));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/purchase-orders
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  const { supplier, items, expectedDelivery, notes } = req.body;
  if (!supplier) return res.status(400).json({ message: "Supplier is required" });
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: "At least one item is required" });

  try {
    const po = await PurchaseOrder.create({
      supplier,
      items,
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
      notes: notes || null,
      createdBy: req.user.userId,
    });
    const populated = await PurchaseOrder.findById(po._id).populate("supplier", "name");
    res.status(201).json(mapPO(populated));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PUT /api/purchase-orders/:id
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  const { supplier, items, expectedDelivery, notes } = req.body;
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: "Purchase order not found" });
    if (po.status === "received")
      return res.status(400).json({ message: "Cannot edit a received purchase order" });

    if (supplier) po.supplier = supplier;
    if (items) po.items = items;
    if (expectedDelivery !== undefined) po.expectedDelivery = expectedDelivery ? new Date(expectedDelivery) : null;
    if (notes !== undefined) po.notes = notes || null;

    await po.save();
    const populated = await PurchaseOrder.findById(po._id).populate("supplier", "name");
    res.json(mapPO(populated));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/purchase-orders/:id/status
router.patch("/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const VALID = ["draft", "sent", "received", "cancelled"];
  const { status } = req.body;
  if (!VALID.includes(status)) return res.status(400).json({ message: "Invalid status" });

  try {
    const po = await PurchaseOrder.findById(req.params.id).populate("supplier", "name");
    if (!po) return res.status(404).json({ message: "Purchase order not found" });
    if (po.status === "received") return res.status(400).json({ message: "PO is already received" });

    const oldStatus = po.status;
    po.status = status;

    // When PO is received: restock all items and log every change
    if (status === "received" && oldStatus !== "received") {
      po.receivedAt = new Date();
      for (const item of po.items) {
        try {
          const product = await Product.findById(item.product);
          if (!product) continue;

          let stockBefore, stockAfter;

          if (item.size && product.sizes && product.sizes.length > 0) {
            const idx = product.sizes.findIndex((sz) => sz.label === item.size);
            if (idx >= 0) {
              stockBefore = product.sizes[idx].stock;
              product.sizes[idx].stock += item.quantity;
              stockAfter = product.sizes[idx].stock;
              product.stock = product.sizes.reduce((s, sz) => s + sz.stock, 0);
              product.markModified("sizes");
            } else {
              stockBefore = product.stock;
              product.stock += item.quantity;
              stockAfter = product.stock;
            }
          } else {
            stockBefore = product.stock;
            product.stock += item.quantity;
            stockAfter = product.stock;
          }

          await product.save({ validateBeforeSave: false });

          await StockLog.create({
            product:     product._id,
            productName: product.name,
            sku:         product.sku ?? null,
            size:        item.size ?? null,
            change:      item.quantity,
            stockBefore,
            stockAfter,
            reason:      "restock",
            note:        `PO: ${po.poNumber}`,
            performedBy: req.user.userId,
          });
        } catch (_) {
          // Non-blocking — continue restocking other items
        }
      }
    }

    await po.save();
    res.json(mapPO(po));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /api/purchase-orders/:id
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: "Purchase order not found" });
    if (po.status === "received")
      return res.status(400).json({ message: "Cannot delete a received purchase order" });
    await po.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
