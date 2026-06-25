const router = require("express").Router();
const Order = require("../models/Order");
const { verifyToken, requireAdmin } = require("../middleware/auth");
const sr = require("../services/shiprocket");

function mapOrder(doc) {
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  if (obj.user?._id) {
    obj.user = { id: obj.user._id.toString(), email: obj.user.email, name: obj.user.name };
  } else if (obj.user) {
    obj.user = obj.user.toString();
  }
  return obj;
}

// GET /api/shiprocket/shipping-rate?pincode=&weight=&cod=
// Public — called from cart to show estimated shipping charge before checkout
router.get("/shipping-rate", async (req, res) => {
  const { pincode, weight = "0.5", cod = "0" } = req.query;

  if (!pincode || !/^\d{6}$/.test(String(pincode)))
    return res.status(400).json({ message: "Valid 6-digit pincode required" });

  const freeThreshold = +(process.env.FREE_SHIPPING_THRESHOLD || "1499");
  const isCod         = String(cod) === "1";

  // If Shiprocket not fully configured, return free shipping as fallback
  if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PICKUP_PINCODE) {
    return res.json({
      serviceable: true,
      free_shipping: true,
      pickup_pincode: process.env.SHIPROCKET_PICKUP_PINCODE || null,
      recommended: { courier_name: null, freight_charge: 0, cod_charge: 0, total_charge: 0, estimated_days: null, etd: null },
      options: [],
    });
  }

  try {
    const result = await sr.getShippingRates(
      String(pincode),
      parseFloat(String(weight)) || 0.5,
      isCod
    );

    if (!result) {
      return res.json({ serviceable: false, free_shipping: false, recommended: null, options: [] });
    }

    res.json(result);
  } catch (e) {
    // Fallback flat rate on auth / network error — don't block checkout
    const fallback = {
      courier_id: null, courier_name: null,
      freight_charge: 60, cod_charge: isCod ? 30 : 0,
      total_charge: isCod ? 90 : 60,
      estimated_days: 5, etd: null, is_recommended: true, rating: null,
    };
    res.json({
      serviceable: true, free_shipping: false, fallback: true, error: e.message,
      pickup_pincode: process.env.SHIPROCKET_PICKUP_PINCODE,
      recommended: fallback, cheapest: fallback, fastest: fallback, options: [fallback],
    });
  }
});

// POST /api/shiprocket/push/:id  — admin: push/re-push an order to Shiprocket
router.post("/push/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "email name");
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status === "cancelled")
      return res.status(400).json({ message: "Cannot push a cancelled order to Shiprocket" });

    const userEmail = typeof order.user === "object" ? order.user.email : "orders@cottoncloudcompany.com";
    const result = await sr.pushOrder(order, userEmail);

    order.shiprocket_order_id    = result.shiprocket_order_id;
    order.shiprocket_shipment_id = result.shiprocket_shipment_id;
    order.awb_code               = result.awb_code;
    order.courier_name           = result.courier_name;
    if (result.awb_code) order.trackingNumber = result.awb_code;
    if (["pending", "confirmed"].includes(order.status)) order.status = "confirmed";
    await order.save();

    res.json(mapOrder(order));
  } catch (e) {
    console.error("[Shiprocket push error]", e.message);
    res.status(500).json({ message: e.message || "Shiprocket push failed" });
  }
});

// POST /api/shiprocket/webhook  — public endpoint for Shiprocket status callbacks
router.post("/webhook", async (req, res) => {
  try {
    if (process.env.SHIPROCKET_WEBHOOK_TOKEN) {
      const incoming = req.headers["x-shiprocket-token"] || req.query.token;
      if (incoming !== process.env.SHIPROCKET_WEBHOOK_TOKEN)
        return res.status(401).json({ message: "Invalid webhook token" });
    }

    const { awb, current_status_id, order_id } = req.body;
    if (!awb && !order_id)
      return res.status(400).json({ message: "Missing awb or order_id in payload" });

    const order = await Order.findOne(awb ? { awb_code: awb } : { orderId: order_id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const newStatus = sr.mapStatus(current_status_id);
    if (newStatus && newStatus !== order.status && order.status !== "cancelled") {
      order.status = newStatus;
      await order.save();
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/shiprocket/track/:awb  — admin: live tracking from Shiprocket API
router.get("/track/:awb", verifyToken, requireAdmin, async (req, res) => {
  try {
    const data = await sr.trackByAWB(req.params.awb);
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message || "Tracking fetch failed" });
  }
});

// GET /api/shiprocket/track-public/:orderId  — public: tracking by our orderId (for track-order page)
router.get("/track-public/:orderId", async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId.toUpperCase() });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!order.awb_code) return res.status(404).json({ message: "No tracking number yet" });

    const data = await sr.trackByAWB(order.awb_code);
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message || "Tracking fetch failed" });
  }
});

module.exports = router;
