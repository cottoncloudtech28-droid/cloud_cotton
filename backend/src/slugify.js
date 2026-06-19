require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/kawaii-corner-shop");
  console.log("Connected to MongoDB");

  const all = await Product.find({}).select("_id name slug");
  console.log(`Total products: ${all.length}`);

  let updated = 0;
  let skipped = 0;

  for (const p of all) {
    if (p.slug) {
      console.log(`  SKIP  ${p.name} → already has slug: ${p.slug}`);
      skipped++;
      continue;
    }
    const slug = `${toSlug(p.name)}-${p._id.toHexString().slice(-6)}`;
    await Product.updateOne({ _id: p._id }, { $set: { slug } });
    console.log(`  SET   ${p.name} → ${slug}`);
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}, Skipped (already had slug): ${skipped}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
