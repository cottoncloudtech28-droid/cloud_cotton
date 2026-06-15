const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    image_url: { type: String, default: null },
    price: { type: Number, required: true },
    discount_percent: { type: Number, default: 0 },
    qty: { type: Number, required: true, min: 1 },
    color: { type: String, default: null },
    size:  { type: String, default: null },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String, default: "" },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: String, unique: true },
    items: [orderItemSchema],
    address: { type: addressSchema, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

orderSchema.pre("save", function (next) {
  if (!this.orderId) {
    this.orderId = "KCS" + Date.now().toString(36).toUpperCase();
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
