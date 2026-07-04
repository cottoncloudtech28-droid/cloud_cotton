const mongoose = require("mongoose");

const stockLogSchema = new mongoose.Schema(
  {
    product:     { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    sku:         { type: String, default: null },
    size:        { type: String, default: null },   // which size variant was affected
    color:       { type: String, default: null },   // which color variant was affected
    change:      { type: Number, required: true },  // negative = deducted, positive = restocked
    stockBefore: { type: Number, required: true },
    stockAfter:  { type: Number, required: true },
    reason:      {
      type: String,
      enum: ["order", "manual_adjust", "bulk_update", "restock", "correction", "cancellation", "return"],
      default: "manual_adjust",
    },
    orderId:     { type: String, default: null },  // set when reason === "order" or "cancellation"
    note:        { type: String, default: null },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

stockLogSchema.index({ product: 1, createdAt: -1 });
stockLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("StockLog", stockLogSchema);
