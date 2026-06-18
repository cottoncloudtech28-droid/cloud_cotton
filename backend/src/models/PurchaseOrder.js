const mongoose = require("mongoose");

const poItemSchema = new mongoose.Schema(
  {
    product:     { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    sku:         { type: String, default: null },
    size:        { type: String, default: null },
    quantity:    { type: Number, required: true, min: 1 },
    unitCost:    { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber:         { type: String, unique: true },
    supplier:         { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    items:            [poItemSchema],
    status:           {
      type: String,
      enum: ["draft", "sent", "received", "cancelled"],
      default: "draft",
    },
    expectedDelivery: { type: Date, default: null },
    totalCost:        { type: Number, default: 0 },
    notes:            { type: String, default: null },
    createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    receivedAt:       { type: Date, default: null },
  },
  { timestamps: true }
);

purchaseOrderSchema.pre("save", function (next) {
  if (!this.poNumber) {
    this.poNumber = "PO-" + Date.now().toString(36).toUpperCase();
  }
  this.totalCost = this.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  next();
});

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
