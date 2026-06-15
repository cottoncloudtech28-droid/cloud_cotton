const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  label:     { type: String, default: "Home", maxlength: 30 },
  fullName:  { type: String, required: true, trim: true },
  phone:     { type: String, required: true, trim: true },
  line1:     { type: String, required: true, trim: true },
  line2:     { type: String, trim: true, default: "" },
  city:      { type: String, required: true, trim: true },
  state:     { type: String, required: true, trim: true },
  pincode:   { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema(
  {
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    name:          { type: String, trim: true, maxlength: 80, default: "" },
    role:          { type: String, enum: ["user", "admin"], default: "user" },
    wishlist:      [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    addresses:     [addressSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
