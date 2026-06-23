const router = require("express").Router();
const Settings = require("../models/Settings");
const { verifyToken, requireAdmin } = require("../middleware/auth");

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

module.exports = router;
