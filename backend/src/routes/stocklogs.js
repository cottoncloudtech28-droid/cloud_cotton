const router = require("express").Router();
const StockLog = require("../models/StockLog");
const { verifyToken, requireAdmin } = require("../middleware/auth");

const mapLog = (doc) => {
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  if (obj.product?._id) {
    obj.product = { id: obj.product._id.toString(), name: obj.product.name, sku: obj.product.sku };
  } else if (obj.product) {
    obj.product = obj.product.toString();
  }
  return obj;
};

// GET /api/stocklogs  — admin: paginated log feed
// ?productId=xxx  filter by product
// ?reason=order|manual_adjust|...  filter by reason
// ?dateFrom=ISO&dateTo=ISO  filter by date range
// ?limit=50&page=1
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const page  = Math.max(parseInt(req.query.page) || 1, 1);
  const filter = {};
  if (req.query.productId) filter.product = req.query.productId;
  if (req.query.reason)    filter.reason  = req.query.reason;
  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo)   filter.createdAt.$lte = new Date(req.query.dateTo);
  }

  try {
    const [logs, total] = await Promise.all([
      StockLog.find(filter)
        .populate("product", "name sku")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      StockLog.countDocuments(filter),
    ]);
    res.json({ logs: logs.map(mapLog), total, page, limit });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
