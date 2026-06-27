const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    product:  { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    user:     { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // Guest fields (when user is not logged in)
    guest_name:  { type: String, trim: true, maxlength: 80, default: null },
    guest_email: { type: String, trim: true, maxlength: 120, default: null },
    rating:   { type: Number, required: true, min: 1, max: 5 },
    title:    { type: String, trim: true, maxlength: 120, default: null },
    body:     { type: String, trim: true, maxlength: 2000, default: "" },
    status:   { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    verified_purchase: { type: Boolean, default: false },
    admin_note: { type: String, trim: true, maxlength: 500, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
