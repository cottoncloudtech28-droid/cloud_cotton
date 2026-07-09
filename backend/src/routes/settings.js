const router = require("express").Router();
const Settings = require("../models/Settings");
const { verifyToken, requireAdmin } = require("../middleware/auth");
const { getTransporter, isConfigured } = require("../lib/mailer");

// GET /api/settings/:key  — any auth (so frontend can fetch GST info for invoices)
router.get("/:key", verifyToken, async (req, res) => {
  try {
    const doc = await Settings.findOne({ key: req.params.key }).lean();
    res.json(doc ? doc.value : {});
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PUT /api/settings/:key  — admin only
router.put("/:key", verifyToken, requireAdmin, async (req, res) => {
  try {
    const doc = await Settings.findOneAndUpdate(
      { key: req.params.key },
      { value: req.body },
      { upsert: true, new: true }
    );
    res.json(doc.value);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/settings/notifications/test  — admin only: send a test email to verify credentials/recipient
router.post("/notifications/test", verifyToken, requireAdmin, async (req, res) => {
  if (!isConfigured())
    return res.status(503).json({ message: "GMAIL_USER / GMAIL_APP_PASSWORD not configured on the server" });

  const to = (req.body?.email || "").trim();
  if (!to) return res.status(400).json({ message: "Recipient email is required" });

  try {
    await getTransporter().sendMail({
      from: `"Cotton Cloud Company" <${process.env.GMAIL_USER}>`,
      to,
      subject: "Test email — Cotton Cloud Company",
      text: "This is a test email from your Cotton Cloud Company admin panel. If you received this, order notification emails are working correctly.",
      html: `
        <div style="font-family:sans-serif;max-width:600px">
          <h2 style="color:#ec4899">Test email ✅</h2>
          <p>This is a test email from your Cotton Cloud Company admin panel.</p>
          <p>If you received this, order notification emails are working correctly.</p>
        </div>
      `,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message || "Failed to send test email" });
  }
});

module.exports = router;
