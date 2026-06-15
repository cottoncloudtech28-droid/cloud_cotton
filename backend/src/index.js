require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:5173"] }));
app.use(express.json({ limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/users", require("./routes/users"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/stocklogs", require("./routes/stocklogs"));

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
