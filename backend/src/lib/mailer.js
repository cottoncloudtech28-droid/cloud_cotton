const nodemailer = require("nodemailer");
const Settings = require("../models/Settings");

let _transporter = null;
function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return _transporter;
}

function isConfigured() {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

// Admin-configurable via Settings key "notifications" (PUT /api/settings/notifications, admin only)
async function getNotificationSettings() {
  const doc = await Settings.findOne({ key: "notifications" }).lean();
  const value = doc?.value || {};
  return {
    order_confirmation_enabled: value.order_confirmation_enabled ?? true,
    admin_alert_enabled: value.admin_alert_enabled ?? true,
    admin_email: (value.admin_email || process.env.CONTACT_EMAIL || process.env.GMAIL_USER || "").trim(),
  };
}

const SITE_URL = (process.env.FRONTEND_URL || "https://cottoncloudcompany.com").split(",")[0].trim();
const FROM = () => `"Cotton Cloud Company" <${process.env.GMAIL_USER}>`;

function money(n) {
  return `₹${Number(n || 0).toFixed(2)}`;
}

// ── Shared card-style email shell ──────────────────────────────────────────────
// Mirrors a standard transactional-email layout: tinted banner header, white card
// body, "system generated" note, brand footer. Built with tables for email-client
// compatibility (no flex/grid — Outlook/Gmail strip those).
const BRAND = {
  name: "Cotton Cloud Company",
  accent: "#ec4899",
  accentDark: "#be185d",
  bannerBg: "#fce7f3",
  supportEmail: "hello@cottoncloud.co",
};

function emailShell({ heading, bodyHtml }) {
  const year = new Date().getFullYear();
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 12px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(17,17,17,0.06);">
          <tr>
            <td style="background:${BRAND.bannerBg};padding:20px 28px;text-align:center;">
              <span style="font-size:15px;font-weight:700;color:${BRAND.accentDark};letter-spacing:.2px;">${heading}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 4px 28px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px 28px;">
              <hr style="border:none;border-top:1px solid #eee;margin:20px 0 16px" />
              <p style="font-size:11px;color:#aaa;margin:0 0 12px;font-style:italic;">Note: This is a system generated message. Do not reply.</p>
              <p style="font-size:13px;color:#555;margin:0">Best Regards,<br/><strong>Team ${BRAND.name}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;padding:16px 28px;text-align:center;border-top:1px solid #f0f0f0;">
              <p style="font-size:11px;color:#999;margin:0">☁️ <strong>${BRAND.name}</strong></p>
              <p style="font-size:11px;color:#999;margin:4px 0 0">© ${year} ${BRAND.name} · <a href="mailto:${BRAND.supportEmail}" style="color:#999;">${BRAND.supportEmail}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function sectionLabel(text) {
  return `<p style="font-size:11px;font-weight:700;color:${BRAND.accentDark};text-transform:uppercase;letter-spacing:.6px;margin:18px 0 8px">${text}</p>`;
}

function kvTable(rows) {
  const trs = rows.map(([label, value]) => `
    <tr>
      <td style="padding:4px 0;font-size:13px;color:#888;vertical-align:top;width:44%">${label}</td>
      <td style="padding:4px 0;font-size:13px;color:#333;font-weight:600;text-align:right;vertical-align:top">${value}</td>
    </tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${trs}</table>`;
}

function itemsTable(items) {
  const rows = (items || []).map((it) => {
    const variant = [it.size, it.color, it.character].filter(Boolean).join(" / ");
    const lineTotal = (it.price || 0) * (1 - (it.discount_percent || 0) / 100) * (it.qty || 1);
    return `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f5f5f5;font-size:13px;color:#333;">
          ${it.name}${variant ? ` <span style="color:#999">(${variant})</span>` : ""} <span style="color:#999">×${it.qty}</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f5f5f5;font-size:13px;color:#333;font-weight:600;text-align:right;white-space:nowrap">${money(lineTotal)}</td>
      </tr>`;
  }).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function ctaButton(label, url) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px">
      <tr>
        <td style="border-radius:999px;background:${BRAND.accent};">
          <a href="${url}" style="display:inline-block;padding:11px 26px;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${label}</a>
        </td>
      </tr>
    </table>`;
}

// Fire-and-forget from routes — callers should not await-fail on these.
async function sendOrderConfirmationEmail(order, customerEmail) {
  if (!isConfigured() || !customerEmail) return;
  const settings = await getNotificationSettings();
  if (!settings.order_confirmation_enabled) return;

  const trackUrl = `${SITE_URL}/order/${order._id}`;
  const subtotal = (order.total || 0) - (order.shipping_charge || 0);
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });

  const body = `
    <p style="font-size:14px;color:#333;margin:0 0 4px">Hi ${order.address.fullName},</p>
    <p style="font-size:14px;color:#555;margin:0 0 4px">Thank you for your order! ☁️ We're excited to get it packed and on its way. Below is a summary of your purchase.</p>

    ${sectionLabel("Order Details")}
    ${kvTable([
      ["Order Number", `#${order.orderId}`],
      ["Order Date", orderDate],
      ["Payment Method", order.payment_method === "cod" ? "Cash on Delivery" : "Paid online"],
      ["Shipping Address", `${order.address.line1}, ${order.address.city}, ${order.address.state} ${order.address.pincode}`],
    ])}

    ${sectionLabel("Items Purchased")}
    ${itemsTable(order.items)}

    ${sectionLabel("Payment Details")}
    ${kvTable([
      ["Subtotal", money(subtotal)],
      ["Shipping", money(order.shipping_charge)],
    ])}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;border-top:1px solid #eee;">
      <tr>
        <td style="padding:10px 0 0;font-size:15px;font-weight:700;color:#222;">Total</td>
        <td style="padding:10px 0 0;font-size:15px;font-weight:700;color:#222;text-align:right">${money(order.total)}</td>
      </tr>
    </table>

    ${ctaButton("Track Your Order", trackUrl)}
  `;

  await getTransporter().sendMail({
    from: FROM(),
    to: customerEmail,
    subject: `Order confirmed — ${order.orderId} ☁️`,
    text: `Hi ${order.address.fullName},\n\nYour order ${order.orderId} has been placed! Total: ${money(order.total)}.\n\nTrack it here: ${trackUrl}\n\n— Cotton Cloud Company`,
    html: emailShell({ heading: "Thank You for Your Purchase!", bodyHtml: body }),
  });
}

async function sendAdminOrderNotification(order, customerEmail) {
  if (!isConfigured()) return;
  const settings = await getNotificationSettings();
  if (!settings.admin_alert_enabled || !settings.admin_email) return;

  const adminUrl = `${SITE_URL}/admin/orders`;
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });

  const body = `
    <p style="font-size:14px;color:#333;margin:0 0 4px">Hi there,</p>
    <p style="font-size:14px;color:#555;margin:0 0 4px">A new order just came in. Here are the details:</p>

    ${sectionLabel("Order Details")}
    ${kvTable([
      ["Order Number", `#${order.orderId}`],
      ["Order Date", orderDate],
      ["Customer", `${order.address.fullName}${customerEmail ? ` (${customerEmail})` : ""}`],
      ["Phone", order.address.phone],
      ["Payment Method", order.payment_method === "cod" ? "Cash on Delivery" : "Paid online"],
      ["Shipping Address", `${order.address.line1}, ${order.address.city}, ${order.address.state} ${order.address.pincode}`],
    ])}

    ${sectionLabel("Items Purchased")}
    ${itemsTable(order.items)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;border-top:1px solid #eee;">
      <tr>
        <td style="padding:10px 0 0;font-size:15px;font-weight:700;color:#222;">Total</td>
        <td style="padding:10px 0 0;font-size:15px;font-weight:700;color:#222;text-align:right">${money(order.total)}</td>
      </tr>
    </table>

    ${ctaButton("View In Admin Panel", adminUrl)}
  `;

  await getTransporter().sendMail({
    from: FROM(),
    to: settings.admin_email,
    subject: `New order — ${order.orderId} (${money(order.total)})`,
    text: `New order ${order.orderId} from ${order.address.fullName} (${customerEmail || "no email on file"}). Total: ${money(order.total)}. View: ${adminUrl}`,
    html: emailShell({ heading: "New Order Received!", bodyHtml: body }),
  });
}

module.exports = {
  getTransporter,
  isConfigured,
  getNotificationSettings,
  sendOrderConfirmationEmail,
  sendAdminOrderNotification,
};
