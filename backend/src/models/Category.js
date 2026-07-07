const mongoose = require("mongoose");

// Defines one specification field available to products in this category.
const specFieldSchema = new mongoose.Schema(
  {
    key:        { type: String, required: true, trim: true },   // stable identifier used on the product
    label:      { type: String, required: true, trim: true, maxlength: 60 },
    type:       { type: String, enum: ["boolean", "text", "number", "select"], default: "boolean" },
    options:    { type: [String], default: [] },  // choices for type "select"
    unit:       { type: String, default: "", maxlength: 20 }, // suffix for type "number" (e.g. "ml", "cm")
    sort_order: { type: Number, default: 0 },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    slug:        { type: String, required: true, unique: true, trim: true },
    name:        { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, maxlength: 500, default: "" },
    banner_url:  { type: String, default: null },
    emoji:       { type: String, default: "🌸", maxlength: 8 },
    sort_order:  { type: Number, default: 0 },
    spec_fields: { type: [specFieldSchema], default: [] }, // category-specific specification definitions
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
