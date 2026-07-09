const router = require("express").Router();
const mongoose = require("mongoose");
const Review = require("../models/Review");
const Order = require("../models/Order");
const { verifyToken, requireAdmin } = require("../middleware/auth");

const mapReview = (doc) => {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = obj._id?.toString();
  delete obj._id;
  delete obj.__v;
  if (obj.product?._id) {
    obj.product = { id: obj.product._id.toString(), name: obj.product.name, image_url: obj.product.image_url };
  } else if (obj.product) {
    obj.product = obj.product.toString();
  }
  if (obj.user?._id) {
    obj.user = { id: obj.user._id.toString(), name: obj.user.name, email: obj.user.email };
  } else if (obj.user) {
    obj.user = obj.user.toString();
  }
  return obj;
};

// ── Public: submit a review ───────────────────────────────────────────────────
// POST /api/reviews
router.post("/", async (req, res) => {
  try {
    const { product_id, rating, title, body, guest_name, guest_email } = req.body;
    if (!product_id || !rating) return res.status(400).json({ message: "product_id and rating are required" });

    // Detect verified purchase if user is logged in
    let userId = null;
    let verified = false;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const jwt = require("jsonwebtoken");
        const { JWT_SECRET } = require("../middleware/auth");
        const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
        userId = payload.id;
        const hasOrder = await Order.exists({
          user: userId,
          "items.product": product_id,
          status: { $in: ["delivered", "shipped"] },
        });
        verified = !!hasOrder;
      } catch (_) { /* ignore bad token — treat as guest */ }
    }

    const review = await Review.create({
      product: product_id,
      user: userId || null,
      guest_name: userId ? null : (guest_name?.trim() || null),
      guest_email: userId ? null : (guest_email?.trim() || null),
      rating: Math.min(5, Math.max(1, parseInt(rating))),
      title: title?.trim() || null,
      body: body?.trim() || "",
      verified_purchase: verified,
      status: "pending",
    });
    res.status(201).json(mapReview(review));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Public: get approved reviews for a product ────────────────────────────────
// GET /api/reviews?product=<id>&limit=20&skip=0
router.get("/", async (req, res) => {
  try {
    const { product, limit = 20, skip = 0 } = req.query;
    const filter = { status: "approved" };
    if (product) filter.product = product;
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("user", "name")
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Math.min(Number(limit), 100))
        .lean(),
      Review.countDocuments(filter),
    ]);
    res.json({ reviews: reviews.map(mapReview), total });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Admin: list all reviews ───────────────────────────────────────────────────
// GET /api/reviews/admin?status=pending&limit=50&skip=0&q=
router.get("/admin", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, limit = 50, skip = 0, q } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (q?.trim()) {
      filter.$or = [
        { title: { $regex: q.trim(), $options: "i" } },
        { body: { $regex: q.trim(), $options: "i" } },
        { guest_name: { $regex: q.trim(), $options: "i" } },
        { guest_email: { $regex: q.trim(), $options: "i" } },
      ];
    }
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("product", "name image_url")
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Math.min(Number(limit), 200))
        .lean(),
      Review.countDocuments(filter),
    ]);
    res.json({ reviews: reviews.map(mapReview), total });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Admin: create a review directly (e.g. a curated/testimonial review) ───────
// POST /api/reviews/admin  { product_id, rating, title?, body?, guest_name?, verified_purchase?, status? }
router.post("/admin", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { product_id, rating, title, body, guest_name, verified_purchase, status } = req.body;
    if (!product_id || !rating) return res.status(400).json({ message: "product_id and rating are required" });

    const review = await Review.create({
      product: product_id,
      user: null,
      guest_name: guest_name?.trim() || "Cotton Cloud Team",
      guest_email: null,
      rating: Math.min(5, Math.max(1, parseInt(rating))),
      title: title?.trim() || null,
      body: body?.trim() || "",
      verified_purchase: !!verified_purchase,
      status: ["pending", "approved", "rejected"].includes(status) ? status : "approved",
      admin_note: "Added directly by admin",
    });
    await review.populate("product", "name image_url");
    res.status(201).json(mapReview(review));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Admin: get single review ──────────────────────────────────────────────────
router.get("/admin/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate("product", "name image_url")
      .populate("user", "name email");
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json(mapReview(review));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Admin: approve / reject / update ─────────────────────────────────────────
// PATCH /api/reviews/admin/:id
router.patch("/admin/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, admin_note, title, body, rating } = req.body;
    const update = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) update.status = status;
    if (admin_note !== undefined) update.admin_note = admin_note?.trim() || null;
    if (title !== undefined) update.title = title?.trim() || null;
    if (body !== undefined) update.body = body?.trim() || "";
    if (rating !== undefined) update.rating = Math.min(5, Math.max(1, parseInt(rating)));
    const review = await Review.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate("product", "name image_url")
      .populate("user", "name email");
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json(mapReview(review));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Admin: delete ─────────────────────────────────────────────────────────────
router.delete("/admin/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json({ message: "Deleted" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Admin: bulk action ────────────────────────────────────────────────────────
// POST /api/reviews/admin/bulk  { ids: [...], action: "approve"|"reject"|"delete" }
router.post("/admin/bulk", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { ids, action } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: "ids array required" });
    if (!["approve", "reject", "delete"].includes(action)) return res.status(400).json({ message: "Invalid action" });

    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
    if (action === "delete") {
      const result = await Review.deleteMany({ _id: { $in: objectIds } });
      return res.json({ affected: result.deletedCount });
    }
    const status = action === "approve" ? "approved" : "rejected";
    const result = await Review.updateMany({ _id: { $in: objectIds } }, { status });
    res.json({ affected: result.modifiedCount });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
