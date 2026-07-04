require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3001;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Too many messages sent. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const defaultOrigins = [
  "http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:5173",
  "https://cloud-cotton.vercel.app",
  "https://cottoncloudcompany.com", "https://www.cottoncloudcompany.com",
];
const allowedOrigins = process.env.FRONTEND_URL
  ? [...defaultOrigins, ...process.env.FRONTEND_URL.split(",").map((o) => o.trim())]
  : defaultOrigins;

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/contact", contactLimiter, require("./routes/contact"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/users", require("./routes/users"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/stocklogs", require("./routes/stocklogs"));
app.use("/api/suppliers", require("./routes/suppliers"));
app.use("/api/purchase-orders", require("./routes/purchaseorders"));
app.use("/api/shiprocket", require("./routes/shiprocket"));
app.use("/api/settings", require("./routes/settings"));
app.use("/api/reviews", require("./routes/reviews"));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/kawaii-corner-shop")
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
