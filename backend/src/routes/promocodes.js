const router = require("express").Router();
const PromoCode = require("../models/PromoCode");
const { verifyToken, requireAdmin } = require("../middleware/auth");

// Seeded on first load so the store has usable codes out of the box (admin can edit/delete).
const DEFAULTS = [
  {
    code: "WELCOME10",
    description: "10% off your order — welcome offer",
    type: "percent",
    value: 10,
    min_order: 499,
    max_discount: 300,
    per_customer_limit: 1,
    is_active: true,
  },
  {
    code: "CLOUD100",
    description: "Flat ₹100 off on orders above ₹999",
    type: "flat",
    value: 100,
    min_order: 999,
    max_discount: null,
    per_customer_limit: 1,
    is_active: true,
  },
];

const mapPromo = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  // Don't leak the full per-customer redemption list to the client; a count is enough.
  obj.customers_used = Array.isArray(obj.redemptions) ? obj.redemptions.length : 0;
  delete obj.redemptions;
  return obj;
};

async function ensureSeeded() {
  const count = await PromoCode.countDocuments();
  if (count === 0) await PromoCode.insertMany(DEFAULTS);
}

// Normalise + validate an incoming create/update payload into safe fields.
function sanitize(body) {
  const type = body.type === "flat" ? "flat" : "percent";
  const out = {
    description: typeof body.description === "string" ? body.description.trim().slice(0, 200) : "",
    type,
    value: Math.max(0, Number(body.value) || 0),
    min_order: Math.max(0, Math.round(Number(body.min_order) || 0)),
    per_customer_limit: Math.max(0, Math.round(Number(body.per_customer_limit) ?? 1)),
    is_active: body.is_active !== false,
    max_discount:
      body.max_discount === null || body.max_discount === "" || body.max_discount === undefined
        ? null
        : Math.max(0, Math.round(Number(body.max_discount) || 0)),
    expires_at: body.expires_at ? new Date(body.expires_at) : null,
  };
  if (type === "percent") out.value = Math.min(100, out.value);
  else out.max_discount = null; // flat codes have no percentage cap
  return out;
}

// ── POST /api/promocodes/validate ── customer applies a code at checkout
// Requires auth so we can enforce the per-customer redemption limit.
router.post("/validate", verifyToken, async (req, res) => {
  try {
    const code = String(req.body.code || "").trim().toUpperCase();
    const subtotal = Math.max(0, Math.round(Number(req.body.subtotal) || 0));
    if (!code) return res.status(400).json({ valid: false, message: "Enter a promo code" });

    const promo = await PromoCode.findOne({ code });
    if (!promo) return res.status(404).json({ valid: false, message: "Invalid promo code" });

    const { ok, reason } = promo.checkValidity(req.user.userId, subtotal);
    if (!ok) return res.status(400).json({ valid: false, message: reason });

    const discount = promo.discountFor(subtotal);
    res.json({
      valid: true,
      code: promo.code,
      type: promo.type,
      value: promo.value,
      discount,
      message:
        promo.type === "percent"
          ? `${promo.value}% off applied`
          : `₹${promo.value} off applied`,
    });
  } catch (e) {
    res.status(500).json({ valid: false, message: e.message });
  }
});

// ── GET /api/promocodes ── admin: list all codes
router.get("/", verifyToken, requireAdmin, async (_req, res) => {
  try {
    await ensureSeeded();
    const codes = await PromoCode.find().sort({ createdAt: -1 });
    res.json(codes.map(mapPromo));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── POST /api/promocodes ── admin: create a code
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const code = String(req.body.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{3,32}$/.test(code))
      return res.status(400).json({ message: "Code must be 3–32 letters/numbers, no spaces" });
    const fields = sanitize(req.body);
    if (fields.value <= 0) return res.status(400).json({ message: "Discount value must be greater than 0" });

    const exists = await PromoCode.findOne({ code });
    if (exists) return res.status(409).json({ message: "A promo code with this name already exists" });

    const promo = await PromoCode.create({ code, ...fields });
    res.status(201).json(mapPromo(promo));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── PUT /api/promocodes/:id ── admin: update a code (the code string itself is immutable)
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const fields = sanitize(req.body);
    if (fields.value <= 0) return res.status(400).json({ message: "Discount value must be greater than 0" });
    const promo = await PromoCode.findByIdAndUpdate(req.params.id, fields, { new: true, runValidators: true });
    if (!promo) return res.status(404).json({ message: "Promo code not found" });
    res.json(mapPromo(promo));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── PATCH /api/promocodes/:id/toggle ── admin: quick active/inactive switch
router.patch("/:id/toggle", verifyToken, requireAdmin, async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) return res.status(404).json({ message: "Promo code not found" });
    promo.is_active = typeof req.body.is_active === "boolean" ? req.body.is_active : !promo.is_active;
    await promo.save();
    res.json(mapPromo(promo));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── DELETE /api/promocodes/:id ── admin: delete a code
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const promo = await PromoCode.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ message: "Promo code not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
