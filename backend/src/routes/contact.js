const router = require("express").Router();
const nodemailer = require("nodemailer");
const { z } = require("zod");

const schema = z.object({
  name:    z.string().trim().min(1).max(100),
  email:   z.string().trim().email().max(255),
  message: z.string().trim().min(5).max(2000),
});

function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

router.post("/", async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: parsed.error.errors[0].message });

  const { name, email, message } = parsed.data;

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("[contact] GMAIL_USER or GMAIL_APP_PASSWORD not configured");
    return res.status(503).json({ message: "Email service not configured" });
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"${name}" <${process.env.GMAIL_USER}>`,
      to: process.env.CONTACT_EMAIL || process.env.GMAIL_USER,
      replyTo: email,
      subject: `[Contact Form] Message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px">
          <h2 style="color:#ec4899">New message from your website</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#888;width:80px">Name</td><td style="padding:8px 0;font-weight:600">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#888">Email</td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
          <p style="white-space:pre-wrap;color:#333">${message}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
          <p style="color:#aaa;font-size:12px">Sent via Cotton Cloud Company contact form</p>
        </div>
      `,
    });

    // Auto-reply to the sender
    await transporter.sendMail({
      from: `"Cotton Cloud Company" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "We got your message! ☁️",
      text: `Hi ${name},\n\nThanks for reaching out! We've received your message and will get back to you within 1–2 business days.\n\nYour message:\n${message}\n\n—\nCotton Cloud Company\nhello@cottoncloud.co`,
      html: `
        <div style="font-family:sans-serif;max-width:600px">
          <h2 style="color:#ec4899">Thanks for reaching out! ☁️</h2>
          <p>Hi ${name},</p>
          <p>We've received your message and will get back to you within <strong>1–2 business days</strong>.</p>
          <blockquote style="border-left:3px solid #ec4899;padding-left:12px;color:#666;font-style:italic;margin:16px 0">
            ${message}
          </blockquote>
          <p>—<br/>Cotton Cloud Company<br/><a href="mailto:hello@cottoncloud.co">hello@cottoncloud.co</a></p>
        </div>
      `,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("[contact] email send failed:", e.message);
    res.status(500).json({ message: "Failed to send message. Please try again." });
  }
});

module.exports = router;
