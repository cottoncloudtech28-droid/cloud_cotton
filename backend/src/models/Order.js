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
    character: { type: String, default: null },
    size:  { type: String, default: null },
    hsn_code: { type: String, default: null },
    gst_rate: { type: Number, default: 12 },
  },
  { _id: false }
);

const gstBreakdownSchema = new mongoose.Schema(
  {
    taxable_value: { type: Number, default: 0 },
    cgst_rate:  { type: Number, default: 0 },
    sgst_rate:  { type: Number, default: 0 },
    igst_rate:  { type: Number, default: 0 },
    cgst_amount:  { type: Number, default: 0 },
    sgst_amount:  { type: Number, default: 0 },
    igst_amount:  { type: Number, default: 0 },
    total_tax:  { type: Number, default: 0 },
    is_interstate: { type: Boolean, default: false },
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
    shipping_charge: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    payment_method: { type: String, enum: ["razorpay", "cod"], default: "cod" },
    payment_status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    razorpay_order_id: { type: String, default: null },
    razorpay_payment_id: { type: String, default: null },
    trackingNumber:        { type: String, default: null },
    shiprocket_order_id:   { type: String, default: null },
    shiprocket_shipment_id:{ type: String, default: null },
    awb_code:              { type: String, default: null },
    courier_name:          { type: String, default: null },
    cancelledBy:   { type: String, enum: ["customer", "admin"], default: null },
    cancelReason:  { type: String, default: null },
    invoice_number: { type: String, default: null },
    buyer_gstin:   { type: String, default: null },
    gst_breakdown: { type: gstBreakdownSchema, default: null },
  },
  { timestamps: true }
);

orderSchema.pre("save", async function (next) {
  if (!this.orderId) {
    this.orderId = "KCS" + Date.now().toString(36).toUpperCase();
  }
  if (!this.invoice_number) {
    const now = new Date();
    const fy = now.getMonth() >= 3
      ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(2)}`
      : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(2)}`;
    const count = await mongoose.model("Order").countDocuments({ invoice_number: { $regex: `^INV/${fy}/` } });
    this.invoice_number = `INV/${fy}/${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
