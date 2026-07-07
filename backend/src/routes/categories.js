const router = require("express").Router();
const Category = require("../models/Category");
const Product = require("../models/Product");
const { verifyToken, requireAdmin } = require("../middleware/auth");

const DEFAULTS = [
  { slug: "stationery",    name: "Stationery",          emoji: "🌸", sort_order: 1,  description: "Beautiful pens, notebooks, washi tapes, and desk accessories." },
  { slug: "lunch-boxes",   name: "Lunch Boxes",          emoji: "🍡", sort_order: 2,  description: "Cute and functional bento boxes for school and work." },
  { slug: "bottles",       name: "Bottles",              emoji: "🫧", sort_order: 3,  description: "Adorable water bottles and sippers to stay hydrated in style." },
  { slug: "lamps",         name: "Lamps",                emoji: "🌙", sort_order: 4,  description: "Cozy kawaii lamps and night lights for your space." },
  { slug: "return-gifts",  name: "Return Gifts",         emoji: "🎀", sort_order: 5,  description: "Thoughtful and affordable return gift sets." },
  { slug: "speakers",      name: "Bluetooth Speakers",   emoji: "🎧", sort_order: 6,  description: "Cute wireless speakers with big sound." },
  { slug: "toys",          name: "Toys",                 emoji: "🐻", sort_order: 7,  description: "Soft toys, fidgets, and playful collectibles." },
  { slug: "quirky",        name: "Quirky Items",         emoji: "🦄", sort_order: 8,  description: "Unique conversation-starters and fun everyday items." },
  { slug: "mixed",         name: "Mixed Items",          emoji: "🍭", sort_order: 9,  description: "A delightful mix of everything cute." },
];

const mapCat = (doc) => {
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

// GET /api/categories  — public
router.get("/", async (req, res) => {
  try {
    let cats = await Category.find().sort("sort_order");
    if (cats.length === 0) {
      cats = await Category.insertMany(DEFAULTS);
    }
    res.json(cats.map(mapCat));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/categories/:slug  — public
router.get("/:slug", async (req, res) => {
  try {
    let cat = await Category.findOne({ slug: req.params.slug });
    if (!cat) {
      const def = DEFAULTS.find((c) => c.slug === req.params.slug);
      if (!def) return res.status(404).json({ message: "Category not found" });
      cat = await Category.create(def);
    }
    res.json(mapCat(cat));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Normalise the spec_fields payload into clean field definitions.
const sanitizeSpecFields = (fields) => {
  if (!Array.isArray(fields)) return undefined;
  return fields
    .filter((f) => f && f.label && String(f.label).trim())
    .map((f, i) => {
      const label = String(f.label).trim().slice(0, 60);
      const type = ["boolean", "text", "number", "select"].includes(f.type) ? f.type : "boolean";
      const key = (f.key && String(f.key).trim())
        ? String(f.key).trim()
        : label.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || `field-${i}`;
      return {
        key,
        label,
        type,
        options: type === "select" && Array.isArray(f.options)
          ? f.options.map((o) => String(o).trim()).filter(Boolean)
          : [],
        unit: type === "number" && f.unit ? String(f.unit).trim().slice(0, 20) : "",
        sort_order: Number.isFinite(f.sort_order) ? f.sort_order : i,
      };
    });
};

// PUT /api/categories/:slug  — admin: update category info
router.put("/:slug", verifyToken, requireAdmin, async (req, res) => {
  const { name, description, banner_url, emoji, sort_order, spec_fields } = req.body;
  try {
    const update = { name, description, banner_url: banner_url || null, emoji, sort_order };
    const cleanSpecs = sanitizeSpecFields(spec_fields);
    if (cleanSpecs !== undefined) update.spec_fields = cleanSpecs;
    const cat = await Category.findOneAndUpdate(
      { slug: req.params.slug },
      update,
      { new: true, upsert: true, runValidators: true }
    );
    res.json(mapCat(cat));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/categories  — admin: create new category
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  const { slug, name, description, banner_url, emoji, sort_order, spec_fields } = req.body;
  if (!slug || !name) return res.status(400).json({ message: "slug and name are required" });
  try {
    const cat = await Category.create({
      slug, name, description, banner_url, emoji, sort_order,
      spec_fields: sanitizeSpecFields(spec_fields) || [],
    });
    res.status(201).json(mapCat(cat));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /api/categories/:slug  — admin: delete a category
router.delete("/:slug", verifyToken, requireAdmin, async (req, res) => {
  try {
    const productCount = await Product.countDocuments({ category: req.params.slug });
    if (productCount > 0) {
      return res.status(400).json({
        message: `Cannot delete: ${productCount} product(s) still use this category. Reassign or remove them first.`,
      });
    }
    const cat = await Category.findOneAndDelete({ slug: req.params.slug });
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
