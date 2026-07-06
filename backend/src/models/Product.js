const mongoose = require("mongoose");

const sizeSchema = new mongoose.Schema(
  { label: { type: String, required: true, trim: true, maxlength: 50 }, stock: { type: Number, default: 0, min: 0 } },
  { _id: false }
);

const colorSchema = new mongoose.Schema(
  {
    label:  { type: String, required: true, trim: true, maxlength: 50 },
    stock:  { type: Number, default: 0, min: 0 },
    images: { type: [String], default: [] }, // subset of the product's images shown when this color is selected
  },
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
    colors:            { type: [colorSchema], default: [] },
    tags:              { type: [String], default: [] },
    sizes:             { type: [sizeSchema], default: [] },
    sku:               { type: String, unique: true, sparse: true },
    reorder_point:     { type: Number, default: 5, min: 0 },
    slug:              { type: String, unique: true, sparse: true },
    hsn_code:          { type: String, default: null, trim: true },
    gst_rate:          { type: Number, default: 12, enum: [0, 5, 12, 18, 28] },
  },
  { timestamps: true }
);

function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

productSchema.pre("save", function (next) {
  // Auto-generate slug from name
  if (!this.slug && this.name) {
    const base = toSlug(this.name);
    this.slug = `${base}-${this._id.toHexString().slice(-6)}`;
  }
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
  // Sync total stock from sizes (or colors, when there are no sizes)
  if (this.sizes && this.sizes.length > 0) {
    this.stock = this.sizes.reduce((s, sz) => s + (sz.stock || 0), 0);
  } else if (this.colors && this.colors.length > 0) {
    this.stock = this.colors.reduce((s, c) => s + (c.stock || 0), 0);
  }
  next();
});

module.exports = mongoose.model("Product", productSchema);
