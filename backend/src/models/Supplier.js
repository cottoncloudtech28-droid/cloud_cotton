const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true, maxlength: 120 },
    contactPerson: { type: String, trim: true, default: null },
    email:         { type: String, trim: true, lowercase: true, default: null },
    phone:         { type: String, trim: true, default: null },
    address:       { type: String, trim: true, default: null },
    website:       { type: String, trim: true, default: null },
    notes:         { type: String, trim: true, maxlength: 1000, default: null },
    isActive:      { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Supplier", supplierSchema);
