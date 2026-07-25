const mongoose = require("mongoose");

// Tracks how many times a specific customer has redeemed this code — used to enforce
// the per-customer redemption limit ("one per customer" by default).
const redemptionSchema = new mongoose.Schema(
  {
    user:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    count: { type: Number, default: 1, min: 0 },
  },
  { _id: false }
);

const promoCodeSchema = new mongoose.Schema(
  {
    code:        { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 32 },
    description: { type: String, default: "", maxlength: 200 },
    type:        { type: String, enum: ["percent", "flat"], default: "percent" },
    value:       { type: Number, required: true, min: 0 },   // percent (0–100) or flat rupees
    min_order:   { type: Number, default: 0, min: 0 },        // minimum cart subtotal to qualify
    max_discount:{ type: Number, default: null },             // cap on discount for "percent" codes (null = no cap)
    per_customer_limit: { type: Number, default: 1, min: 0 }, // 0 = unlimited redemptions per customer
    is_active:   { type: Boolean, default: true },
    expires_at:  { type: Date, default: null },               // null = never expires
    used_count:  { type: Number, default: 0 },                // total redemptions across all customers
    redemptions: { type: [redemptionSchema], default: [] },
  },
  { timestamps: true }
);

// Rupee discount this code grants on a given subtotal (never exceeds the subtotal itself).
promoCodeSchema.methods.discountFor = function (subtotal) {
  if (this.type === "percent") {
    let d = Math.round((subtotal * this.value) / 100);
    if (this.max_discount != null) d = Math.min(d, this.max_discount);
    return Math.min(d, subtotal);
  }
  return Math.min(this.value, subtotal); // flat
};

// How many times the given customer has already redeemed this code.
promoCodeSchema.methods.usageByUser = function (userId) {
  const entry = this.redemptions.find((r) => r.user.toString() === String(userId));
  return entry ? entry.count : 0;
};

// Validate the code against a customer + cart subtotal. Returns { ok, reason }.
promoCodeSchema.methods.checkValidity = function (userId, subtotal) {
  if (!this.is_active) return { ok: false, reason: "This promo code is no longer active" };
  if (this.expires_at && this.expires_at.getTime() < Date.now())
    return { ok: false, reason: "This promo code has expired" };
  if (subtotal < this.min_order)
    return { ok: false, reason: `Add ₹${this.min_order - subtotal} more to use this code (min order ₹${this.min_order})` };
  if (this.per_customer_limit > 0 && userId && this.usageByUser(userId) >= this.per_customer_limit)
    return { ok: false, reason: "You've already used this promo code" };
  return { ok: true };
};

// Record a redemption by a customer (increments their per-customer count + total).
promoCodeSchema.methods.recordRedemption = function (userId) {
  const entry = this.redemptions.find((r) => r.user.toString() === String(userId));
  if (entry) entry.count += 1;
  else this.redemptions.push({ user: userId, count: 1 });
  this.used_count += 1;
  return this.save();
};

module.exports = mongoose.model("PromoCode", promoCodeSchema);
