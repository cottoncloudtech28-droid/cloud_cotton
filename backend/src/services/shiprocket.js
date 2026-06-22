const BASE = "https://apiv2.shiprocket.in/v1/external";

let _token = null;
let _tokenExpiry = 0;

async function srFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || (Array.isArray(data.errors) ? data.errors[0] : null) || `Shiprocket error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

async function getToken() {
  if (_token && Date.now() < _tokenExpiry) return _token;
  if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD)
    throw new Error("SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD env vars are required");

  const data = await srFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD }),
  });
  _token = data.token;
  _tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
  return _token;
}

async function authHeaders() {
  return { Authorization: `Bearer ${await getToken()}` };
}

// Build Shiprocket order payload from our order document
function buildPayload(order, userEmail) {
  const parts = (order.address.fullName || "Customer").trim().split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ") || ".";

  const finalPrice = (item) => +(item.price * (1 - (item.discount_percent || 0) / 100)).toFixed(2);
  const subTotal = +order.items.reduce((s, i) => s + finalPrice(i) * i.qty, 0).toFixed(2);

  const payload = {
    order_id: order.orderId,
    order_date: new Date(order.createdAt).toISOString().replace("T", " ").slice(0, 19),
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",

    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: order.address.line1,
    billing_address_2: order.address.line2 || "",
    billing_city: order.address.city,
    billing_pincode: order.address.pincode,
    billing_state: order.address.state,
    billing_country: "India",
    billing_email: userEmail || "orders@cottoncloudcompany.com",
    billing_phone: order.address.phone,

    shipping_is_billing: true,

    order_items: order.items.map((item) => ({
      name: item.name,
      sku: item.productId?.toString() || "SKU",
      units: item.qty,
      selling_price: String(finalPrice(item)),
      discount: "",
      tax: "",
      hsn: "",
    })),

    payment_method: order.payment_method === "cod" ? "COD" : "Prepaid",
    sub_total: subTotal,

    length: +(process.env.SHIPROCKET_DEFAULT_LENGTH || "10"),
    breadth: +(process.env.SHIPROCKET_DEFAULT_BREADTH || "10"),
    height: +(process.env.SHIPROCKET_DEFAULT_HEIGHT || "10"),
    weight: +(process.env.SHIPROCKET_DEFAULT_WEIGHT || "0.5"),
  };

  if (process.env.SHIPROCKET_CHANNEL_ID)
    payload.channel_id = +process.env.SHIPROCKET_CHANNEL_ID;

  return payload;
}

async function createOrder(order, userEmail) {
  return srFetch("/orders/create/adhoc", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(buildPayload(order, userEmail)),
  });
}

async function assignCourier(shipmentId) {
  return srFetch("/courier/assign/awb", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ shipment_id: String(shipmentId) }),
  });
}

async function requestPickup(shipmentId) {
  return srFetch("/courier/generate/pickup", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ shipment_id: [String(shipmentId)] }),
  });
}

async function trackByAWB(awb) {
  return srFetch(`/courier/track/awb/${awb}`, { headers: await authHeaders() });
}

async function getShippingRates(deliveryPincode, weightKg, isCod) {
  const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE;
  if (!pickupPincode) throw new Error("SHIPROCKET_PICKUP_PINCODE not set");

  const params = new URLSearchParams({
    pickup_postcode:   String(pickupPincode),
    delivery_postcode: String(deliveryPincode),
    weight:            String(weightKg),
    cod:               isCod ? "1" : "0",
  });

  const data = await srFetch(`/courier/serviceability/?${params}`, {
    headers: await authHeaders(),
  });

  const couriers = data?.data?.available_courier_companies ?? [];
  if (!couriers.length) return null;

  // Sort by total rate (freight + COD charges)
  couriers.sort((a, b) => (a.rate ?? a.freight_charge ?? 999) - (b.rate ?? b.freight_charge ?? 999));
  const best = couriers[0];

  return {
    shipping_charge:    Math.round(best.rate ?? best.freight_charge ?? 0),
    cod_charge:         Math.round(best.cod_charges ?? 0),
    courier_name:       best.courier_name ?? null,
    courier_id:         best.courier_company_id ?? null,
    estimated_days:     best.estimated_delivery_days ?? null,
    serviceable:        true,
  };
}

// Full push: create → assign AWB → request pickup
async function pushOrder(order, userEmail) {
  const created = await createOrder(order, userEmail);

  const result = {
    shiprocket_order_id: created.order_id ? String(created.order_id) : null,
    shiprocket_shipment_id: created.shipment_id ? String(created.shipment_id) : null,
    awb_code: created.awb_code || null,
    courier_name: created.courier_name || null,
  };

  if (result.shiprocket_shipment_id && !result.awb_code) {
    try {
      const awbRes = await assignCourier(result.shiprocket_shipment_id);
      result.awb_code = awbRes.response?.awb_code || awbRes.awb_code || null;
      result.courier_name = awbRes.response?.courier_name || awbRes.courier_name || null;
    } catch (_) { /* non-fatal — can retry from admin panel */ }
  }

  if (result.shiprocket_shipment_id) {
    try { await requestPickup(result.shiprocket_shipment_id); } catch (_) {}
  }

  return result;
}

// Map Shiprocket status codes to our order statuses
function mapStatus(statusId) {
  const id = Number(statusId);
  if ([1, 2, 3, 4, 5, 6].includes(id)) return "shipped";
  if (id === 7) return "delivered";
  if ([8, 9, 17, 18].includes(id)) return "cancelled";
  return null;
}

module.exports = { createOrder, assignCourier, requestPickup, trackByAWB, pushOrder, mapStatus, getShippingRates };
