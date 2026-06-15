const router = require("express").Router();
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");

const mapProduct = (doc) => {
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

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
