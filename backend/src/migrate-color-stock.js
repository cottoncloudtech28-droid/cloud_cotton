// One-off migration: convert Product.colors from plain label strings to
// { label, stock } objects, so colors get their own trackable stock like sizes already have.
// Each color starts with the product's current total stock (nothing looks falsely
// out-of-stock right after migration — an admin can then fine-tune per-color counts).
//
// Run once after deploying the schema change: node src/migrate-color-stock.js
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/kawaii-corner-shop");
  console.log("Connected to MongoDB");

  // Bypass the Product schema (which now expects color objects) so we can read the raw,
  // possibly-still-string colors array as it exists in the database today.
  const raw = await mongoose.connection.db.collection("products").find({}).toArray();

  let migrated = 0;
  let skipped = 0;

  for (const doc of raw) {
    const colors = doc.colors ?? [];
    const isOldFormat = colors.length > 0 && typeof colors[0] === "string";
    if (!isOldFormat) { skipped++; continue; }

    const newColors = colors.map((label) => ({ label, stock: doc.stock ?? 0 }));
    await mongoose.connection.db.collection("products").updateOne(
      { _id: doc._id },
      { $set: { colors: newColors } }
    );
    console.log(`  Migrated "${doc.name}" — ${newColors.length} color(s) set to stock=${doc.stock ?? 0}`);
    migrated++;
  }

  console.log(`Done. Migrated ${migrated} product(s), skipped ${skipped} (already migrated or no colors).`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
