// One-off migration: assign a SKU to any existing product that doesn't have one yet.
// Relies on the Product model's own pre("save") auto-generation logic, so the format
// stays in sync with what new products get: KCS-{CATEGORY}-{RANDOM}.
//
// Run once after deploying the sku field: node src/backfill-sku.js
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

async function backfill() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/kawaii-corner-shop");
  console.log("Connected to MongoDB");

  const products = await Product.find({
    $or: [{ sku: null }, { sku: { $exists: false } }, { sku: "" }],
  });
  console.log(`Found ${products.length} product(s) without a SKU.`);

  let count = 0;
  for (const p of products) {
    await p.save(); // pre-save hook fills in sku since it's still empty
    console.log(`  ${p.name} → ${p.sku}`);
    count++;
  }
  console.log(`Backfilled SKU for ${count} product(s).`);

  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error("Backfill failed:", err.message);
  process.exit(1);
});
