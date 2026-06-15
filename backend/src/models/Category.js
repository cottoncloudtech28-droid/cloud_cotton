const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    slug:        { type: String, required: true, unique: true, trim: true },
    name:        { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, maxlength: 500, default: "" },
    banner_url:  { type: String, default: null },
    emoji:       { type: String, default: "🌸", maxlength: 8 },
    sort_order:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
