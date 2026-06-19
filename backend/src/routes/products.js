const router = require("express").Router();
const { z } = require("zod");
const Product = require("../models/Product");
const StockLog = require("../models/StockLog"); // used for restock recommendations + stock logging
const { verifyToken, requireAdmin } = require("../middleware/auth");

const sizeZ = z.object({
  label: z.string().trim().min(1).max(50),
  stock: z.number().int().min(0),
});

const schema = z.object({
  name:              z.string().trim().min(1).max(120),
  short_description: z.string().trim().max(300).nullable().optional(),
  description:       z.string().trim().max(2000).nullable().optional(),
  price:             z.number().min(0).max(1000000),
  discount_percent:  z.number().int().min(0).max(100).default(0),
  category:          z.string().trim().min(1).max(40),
  stock:             z.number().int().min(0).default(0),
  image_url:         z.string().nullable().optional(),
  images:            z.array(z.string()).default([]),
  colors:            z.array(z.string()).default([]),
  tags:              z.array(z.string().trim().max(30)).default([]),
  sizes:             z.array(sizeZ).default([]),
  reorder_point:     z.number().int().min(0).default(5).optional(),
});

const mapDoc = (doc) => {
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  // Ensure image_url reflects images[0]
  if (obj.images && obj.images.length > 0) obj.image_url = obj.images[0];
  // Ensure stock reflects sum of sizes
  if (obj.sizes && obj.sizes.length > 0) {
    obj.stock = obj.sizes.reduce((s, sz) => s + (sz.stock || 0), 0);
  }
  return obj;
};

const parseBody = (body) => ({
  ...body,
  price:            Number(body.price),
  discount_percent: Number(body.discount_percent ?? 0),
  stock:            Number(body.stock ?? 0),
  reorder_point:    Number(body.reorder_point ?? 5),
  images:           Array.isArray(body.images) ? body.images : [],
  colors:           Array.isArray(body.colors) ? body.colors : [],
  tags:             Array.isArray(body.tags) ? body.tags : [],
  sizes:            Array.isArray(body.sizes)
                      ? body.sizes.map((s) => ({ label: s.label, stock: Number(s.stock ?? 0) }))
                      : [],
});

// GET /api/products/suggest  — public: instant autocomplete suggestions
router.get("/suggest", async (req, res) => {
  const raw = (req.query.q || "").trim();
  if (raw.length < 1) return res.json([]);
  try {
    const limitNum = Math.min(8, parseInt(req.query.limit) || 6);
    // Escape regex special chars
    const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const products = await Product.find({
      is_active: true,
      $or: [
        { name: regex },
        { tags: { $in: [regex] } },
        { category: regex },
        { short_description: regex },
        { description: regex },
      ],
    })
      .select("name price discount_percent image_url images category tags stock slug")
      .limit(limitNum * 4)
      .lean();

    // Relevance scoring
    const q = raw.toLowerCase();
    const scored = products.map((p) => {
      const name = p.name.toLowerCase();
      let score = 0;
      if (name === q)                        score = 100;
      else if (name.startsWith(q))           score = 85;
      else if (name.includes(q))             score = 70;
      else if ((p.tags || []).some((t) => t.toLowerCase() === q))        score = 65;
      else if ((p.tags || []).some((t) => t.toLowerCase().startsWith(q))) score = 55;
      else if ((p.tags || []).some((t) => t.toLowerCase().includes(q)))   score = 45;
      else if ((p.category || "").toLowerCase().includes(q)) score = 35;
      else score = 20;
      return { ...p, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);

    const results = scored.slice(0, limitNum).map((p) => ({
      id: p._id.toString(),
      name: p.name,
      slug: p.slug ?? null,
      price: p.price,
      discount_percent: p.discount_percent ?? 0,
      image_url: p.images?.[0] ?? p.image_url ?? null,
      category: p.category,
      stock: p.stock,
    }));

    res.json(results);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/products  — public, with sorting + pagination
router.get("/", async (req, res) => {
  try {
    const { cat, q, tag, sort, page, limit } = req.query;
    const filter = { is_active: true };
    if (cat && cat !== "all") filter.category = cat;
    if (tag) filter.tags = { $in: [tag] };
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name:              { $regex: escaped, $options: "i" } },
        { short_description: { $regex: escaped, $options: "i" } },
        { description:       { $regex: escaped, $options: "i" } },
        { category:          { $regex: escaped, $options: "i" } },
        { tags:              { $in: [new RegExp(escaped, "i")] } },
      ];
    }

    const sortMap = {
      newest:      { createdAt: -1 },
      "price-asc": { price: 1 },
      "price-desc":{ price: -1 },
      popular:     { discount_percent: -1, createdAt: -1 },
    };
    const sortObj = sortMap[sort] || { createdAt: -1 };

    const pageNum  = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(96, Math.max(1, parseInt(limit) || 24));
    const skip     = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortObj).skip(skip).limit(limitNum),
      Product.countDocuments(filter),
    ]);

    res.json({ products: products.map(mapDoc), total, page: pageNum, limit: limitNum });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/products/all  — admin, includes inactive
router.get("/all", verifyToken, requireAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products.map(mapDoc));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/products
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  const parsed = schema.safeParse(parseBody(req.body));
  if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });
  try {
    const p = await Product.create(parsed.data);
    res.status(201).json(mapDoc(p));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PUT /api/products/:id
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  const parsed = schema.safeParse(parseBody(req.body));
  if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
    if (!p) return res.status(404).json({ message: "Product not found" });
    res.json(mapDoc(p));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /api/products/:id
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const p = await Product.findByIdAndDelete(req.params.id);
    if (!p) return res.status(404).json({ message: "Product not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/products/:id/toggle
router.patch("/:id/toggle", verifyToken, requireAdmin, async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ message: "Product not found" });
    p.is_active = !p.is_active;
    await p.save();
    res.json(mapDoc(p));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/products/low-stock  — admin: products at or below reorder_point
router.get("/low-stock", verifyToken, requireAdmin, async (req, res) => {
  try {
    const products = await Product.find({
      is_active: true,
      $expr: { $lte: ["$stock", "$reorder_point"] },
    }).sort({ stock: 1 });
    res.json(products.map(mapDoc));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/products/bulk-stock  — admin: update stock for multiple products at once
// body: { updates: [{ id, stock, note? }] }
router.patch("/bulk-stock", verifyToken, requireAdmin, async (req, res) => {
  const { updates } = req.body;
  if (!Array.isArray(updates) || updates.length === 0)
    return res.status(400).json({ message: "updates array is required" });

  const results = [];
  for (const { id, stock, note } of updates) {
    try {
      const p = await Product.findById(id);
      if (!p) continue;

      const stockBefore = p.stock;
      const newStock = Math.max(0, parseInt(stock) || 0);

      // If product uses sizes, distribute evenly or just update flat stock
      if (p.sizes && p.sizes.length > 0) {
        // Only update flat stock field; admin should use per-size editing for variants
        p.stock = newStock;
        p.markModified("stock");
      } else {
        p.stock = newStock;
      }

      await p.save({ validateBeforeSave: false });

      if (stockBefore !== newStock) {
        await StockLog.create({
          product:     p._id,
          productName: p.name,
          sku:         p.sku ?? null,
          change:      newStock - stockBefore,
          stockBefore,
          stockAfter:  newStock,
          reason:      "bulk_update",
          note:        note ?? null,
          performedBy: req.user.userId,
        });
      }

      results.push(mapDoc(p));
    } catch (_) { /* skip bad items */ }
  }

  res.json({ updated: results.length, products: results });
});

// PATCH /api/products/:id/stock  — admin: adjust single product stock
// body: { stock, size?, note?, reason? }
router.patch("/:id/stock", verifyToken, requireAdmin, async (req, res) => {
  const { stock, size, note, reason } = req.body;
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ message: "Product not found" });

    let stockBefore, stockAfter, targetSize = null;

    if (size && p.sizes && p.sizes.length > 0) {
      const idx = p.sizes.findIndex((sz) => sz.label === size);
      if (idx < 0) return res.status(400).json({ message: `Size "${size}" not found on this product` });
      stockBefore = p.sizes[idx].stock;
      p.sizes[idx].stock = Math.max(0, parseInt(stock) || 0);
      stockAfter = p.sizes[idx].stock;
      p.stock = p.sizes.reduce((s, sz) => s + sz.stock, 0);
      p.markModified("sizes");
      targetSize = size;
    } else {
      stockBefore = p.stock;
      p.stock = Math.max(0, parseInt(stock) || 0);
      stockAfter = p.stock;
    }

    await p.save({ validateBeforeSave: false });

    await StockLog.create({
      product:     p._id,
      productName: p.name,
      sku:         p.sku ?? null,
      size:        targetSize,
      change:      stockAfter - stockBefore,
      stockBefore,
      stockAfter,
      reason:      reason ?? "manual_adjust",
      note:        note ?? null,
      performedBy: req.user.userId,
    });

    res.json(mapDoc(p));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/products/restock-recommendations  — admin: velocity-based restock suggestions
router.get("/restock-recommendations", verifyToken, requireAdmin, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Aggregate units sold per product in the last 30 days
    const salesData = await StockLog.aggregate([
      { $match: { reason: "order", createdAt: { $gte: thirtyDaysAgo }, change: { $lt: 0 } } },
      { $group: { _id: "$product", totalSold: { $sum: { $abs: "$change" } } } },
    ]);
    const salesMap = new Map(salesData.map((d) => [d._id.toString(), d.totalSold]));

    const products = await Product.find({ is_active: true });

    const recommendations = products
      .map((p) => {
        const sold30d = salesMap.get(p._id.toString()) || 0;
        const dailyRate = sold30d / 30;
        const daysRemaining = dailyRate > 0 ? Math.round(p.stock / dailyRate) : null;
        const urgency =
          p.stock === 0 ? "critical"
          : daysRemaining !== null && daysRemaining < 7 ? "critical"
          : daysRemaining !== null && daysRemaining < 14 ? "warning"
          : p.stock <= (p.reorder_point ?? 5) ? "warning"
          : "ok";
        const recommendedQty = Math.max(
          (p.reorder_point ?? 5) * 3,
          sold30d > 0 ? Math.ceil(sold30d * 1.5) : (p.reorder_point ?? 5) * 2
        );

        return {
          id:             p._id.toString(),
          name:           p.name,
          sku:            p.sku ?? null,
          image_url:      p.image_url ?? null,
          currentStock:   p.stock,
          reorderPoint:   p.reorder_point ?? 5,
          sold30d,
          dailyRate:      Math.round(dailyRate * 10) / 10,
          daysRemaining,
          urgency,
          recommendedQty,
        };
      })
      .filter((r) => r.urgency !== "ok")
      .sort((a, b) => {
        const order = { critical: 0, warning: 1, ok: 2 };
        return order[a.urgency] - order[b.urgency];
      });

    res.json(recommendations);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/products/:id  — public, single product (accepts MongoDB id OR slug)
router.get("/:id", async (req, res) => {
  try {
    const param = req.params.id;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(param);
    const p = isObjectId
      ? await Product.findById(param)
      : await Product.findOne({ slug: param });
    if (!p || !p.is_active) return res.status(404).json({ message: "Product not found" });
    res.json(mapDoc(p));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
