const router = require("express").Router();
const User = require("../models/User");
const Order = require("../models/Order");
const { verifyToken, requireAdmin } = require("../middleware/auth");

const mapProduct = (doc) => {
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

// GET /api/users/admin/all  — admin: list all customers with order stats
router.get("/admin/all", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { q, page = "1", limit = "20" } = req.query;
    const pageNum  = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip     = (pageNum - 1) * limitNum;

    const filter = q
      ? { $or: [
          { email: { $regex: q, $options: "i" } },
          { name:  { $regex: q, $options: "i" } },
        ] }
      : {};

    const [users, total] = await Promise.all([
      User.find(filter).select("-password_hash -wishlist -addresses").sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      User.countDocuments(filter),
    ]);

    const userIds = users.map((u) => u._id);
    const orderStats = await Order.aggregate([
      { $match: { user: { $in: userIds }, status: { $ne: "cancelled" } } },
      { $group: {
          _id: "$user",
          orderCount: { $sum: 1 },
          totalSpent: { $sum: "$total" },
          lastOrderAt: { $max: "$createdAt" },
      }},
    ]);
    const statsMap = Object.fromEntries(orderStats.map((s) => [s._id.toString(), s]));

    const result = users.map((u) => {
      const stats = statsMap[u._id.toString()] || { orderCount: 0, totalSpent: 0, lastOrderAt: null };
      return {
        id: u._id.toString(),
        email: u.email,
        name: u.name || "",
        role: u.role,
        createdAt: u.createdAt,
        orderCount: stats.orderCount,
        totalSpent: Math.round(stats.totalSpent),
        lastOrderAt: stats.lastOrderAt,
      };
    });

    res.json({ customers: result, total, page: pageNum, limit: limitNum });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/users/admin/:id/role  — admin: change user role
router.patch("/admin/:id/role", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["customer", "admin"].includes(role))
      return res.status(400).json({ message: "Invalid role" });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password_hash");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ id: user._id.toString(), email: user.email, name: user.name, role: user.role });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/users/wishlist  — get current user's wishlist
router.get("/wishlist", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate("wishlist");
    if (!user) return res.status(404).json({ message: "User not found" });
    const active = user.wishlist.filter((p) => p.is_active);
    res.json(active.map(mapProduct));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/users/wishlist/ids  — just the product ID list (lightweight)
router.get("/wishlist/ids", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("wishlist");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.wishlist.map((id) => id.toString()));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/users/wishlist/:productId  — add product to wishlist
router.post("/wishlist/:productId", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const pid = req.params.productId;
    const already = user.wishlist.some((id) => id.toString() === pid);
    if (!already) user.wishlist.push(pid);
    await user.save();
    res.json({ ok: true, count: user.wishlist.length });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /api/users/wishlist/:productId  — remove product from wishlist
router.delete("/wishlist/:productId", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.wishlist = user.wishlist.filter((id) => id.toString() !== req.params.productId);
    await user.save();
    res.json({ ok: true, count: user.wishlist.length });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Addresses ────────────────────────────────────────────────────────────────

const mapAddr = (a) => ({
  id: a._id.toString(), label: a.label, fullName: a.fullName, phone: a.phone,
  line1: a.line1, line2: a.line2 || "", city: a.city, state: a.state,
  pincode: a.pincode, isDefault: a.isDefault,
});

// GET /api/users/addresses
router.get("/addresses", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("addresses");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.addresses.map(mapAddr));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/users/addresses
router.post("/addresses", verifyToken, async (req, res) => {
  const { label, fullName, phone, line1, line2, city, state, pincode, isDefault } = req.body;
  if (!fullName || !phone || !line1 || !city || !state || !pincode)
    return res.status(400).json({ message: "fullName, phone, line1, city, state, pincode are required" });
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (isDefault) user.addresses.forEach((a) => { a.isDefault = false; });
    user.addresses.push({ label: label || "Home", fullName, phone, line1, line2: line2 || "", city, state, pincode, isDefault: !!isDefault });
    await user.save();
    res.status(201).json(user.addresses.map(mapAddr));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PUT /api/users/addresses/:addrId
router.put("/addresses/:addrId", verifyToken, async (req, res) => {
  const { label, fullName, phone, line1, line2, city, state, pincode, isDefault } = req.body;
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const addr = user.addresses.id(req.params.addrId);
    if (!addr) return res.status(404).json({ message: "Address not found" });
    if (isDefault) user.addresses.forEach((a) => { a.isDefault = false; });
    if (label    !== undefined) addr.label    = label;
    if (fullName !== undefined) addr.fullName = fullName;
    if (phone    !== undefined) addr.phone    = phone;
    if (line1    !== undefined) addr.line1    = line1;
    if (line2    !== undefined) addr.line2    = line2;
    if (city     !== undefined) addr.city     = city;
    if (state    !== undefined) addr.state    = state;
    if (pincode  !== undefined) addr.pincode  = pincode;
    if (isDefault !== undefined) addr.isDefault = !!isDefault;
    await user.save();
    res.json(user.addresses.map(mapAddr));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// DELETE /api/users/addresses/:addrId
router.delete("/addresses/:addrId", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.addresses = user.addresses.filter((a) => a._id.toString() !== req.params.addrId);
    await user.save();
    res.json(user.addresses.map(mapAddr));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/users/addresses/:addrId/default
router.patch("/addresses/:addrId/default", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.addresses.forEach((a) => { a.isDefault = a._id.toString() === req.params.addrId; });
    await user.save();
    res.json(user.addresses.map(mapAddr));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
