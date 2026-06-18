const router = require("express").Router();
const Supplier = require("../models/Supplier");
const { verifyToken, requireAdmin } = require("../middleware/auth");

const mapSupplier = (doc) => {
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

// GET /api/suppliers
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.json(suppliers.map(mapSupplier));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/suppliers
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  const { name, contactPerson, email, phone, address, website, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Supplier name is required" });
  try {
    const supplier = await Supplier.create({ name, contactPerson, email, phone, address, website, notes });
    res.status(201).json(mapSupplier(supplier));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PUT /api/suppliers/:id
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  const { name, contactPerson, email, phone, address, website, notes, isActive } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Supplier name is required" });
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { name, contactPerson, email, phone, address, website, notes, isActive },
      { new: true }
    );
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    res.json(mapSupplier(supplier));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /api/suppliers/:id
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
