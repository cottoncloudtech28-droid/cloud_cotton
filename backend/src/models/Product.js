const mongoose = require("mongoose");

const sizeSchema = new mongoose.Schema(
  { label: { type: String, required: true, trim: true, maxlength: 50 }, stock: { type: Number, default: 0, min: 0 } },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name:              { type: String, required: true, trim: true, maxlength: 120 },
    short_description: { type: String, maxlength: 300, default: null },
    description:       { type: String, maxlength: 2000, default: null },
    price:             { type: Number, required: true, min: 0 },
    discount_percent:  { type: Number, default: 0, min: 0, max: 100 },
    image_url:         { type: String, default: null },   // primary image (backward compat)
    images:            { type: [String], default: [] },   // all images
    category:          { type: String, required: true, default: "stationery" },
    stock:             { type: Number, default: 0, min: 0 },
    is_active:         { type: Boolean, default: true },
    colors:            { type: [String], default: [] },
    tags:              { type: [String], default: [] },
    sizes:             { type: [sizeSchema], default: [] },
    sku:               { type: String, unique: true, sparse: true },
    reorder_point:     { type: Number, default: 5, min: 0 },
  },
  { timestamps: true }
);

productSchema.pre("save", function (next) {
  // Auto-generate SKU
  if (!this.sku) {
    const prefix = (this.category || "GEN").replace(/-/g, "").slice(0, 4).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    this.sku = `KCS-${prefix}-${rand}`;
  }
  // Sync image_url from images[0]
  if (this.images && this.images.length > 0) {
    this.image_url = this.images[0];
  }
  // Sync total stock from sizes
  if (this.sizes && this.sizes.length > 0) {
    this.stock = this.sizes.reduce((s, sz) => s + (sz.stock || 0), 0);
  }
  next();
});

module.exports = mongoose.model("Product", productSchema);
