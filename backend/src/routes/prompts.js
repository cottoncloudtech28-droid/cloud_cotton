const router = require("express").Router();
const PromptPreset = require("../models/PromptPreset");
const { PROMPT_GROUPS, DEFAULT_PROMPTS } = require("../lib/promptDefaults");
const { verifyToken, requireAdmin } = require("../middleware/auth");

const mapPreset = (doc) => {
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

const listAll = async () => {
  const presets = await PromptPreset.find().sort({ group: 1, sort_order: 1 });
  return presets.map(mapPreset);
};

// Seed on first read so existing installs pick up the presets that used to be
// hardcoded in the frontend, without needing a separate migration step.
const seedIfEmpty = async () => {
  if (await PromptPreset.countDocuments()) return;
  await PromptPreset.insertMany(DEFAULT_PROMPTS);
};

// Validate and normalise a create/update payload. Returns { error } or { data }.
const parseBody = (body, { partial = false } = {}) => {
  const data = {};

  if (body.group !== undefined || !partial) {
    if (!PROMPT_GROUPS.includes(body.group)) {
      return { error: `group must be one of: ${PROMPT_GROUPS.join(", ")}` };
    }
    data.group = body.group;
  }

  if (body.label !== undefined || !partial) {
    const label = String(body.label ?? "").trim();
    if (!label) return { error: "label is required" };
    data.label = label.slice(0, 80);
  }

  if (body.value !== undefined || !partial) {
    const value = String(body.value ?? "").trim();
    if (!value) return { error: "value (the prompt text) is required" };
    data.value = value.slice(0, 4000);
  }

  if (typeof body.is_active === "boolean") data.is_active = body.is_active;
  if (Number.isFinite(body.sort_order)) data.sort_order = body.sort_order;

  return { data };
};

// These presets are admin tooling only — nothing here is public.
router.use(verifyToken, requireAdmin);

// GET /api/prompts — every preset, grouped and in display order
router.get("/", async (_req, res) => {
  try {
    await seedIfEmpty();
    res.json(await listAll());
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/prompts/reorder — declared before /:id so "reorder" isn't read as an id
router.patch("/reorder", async (req, res) => {
  const { order } = req.body; // [{ id, sort_order }, ...]
  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ message: "order must be a non-empty array of { id, sort_order }" });
  }
  try {
    await PromptPreset.bulkWrite(
      order.map(({ id, sort_order }) => ({
        updateOne: { filter: { _id: id }, update: { sort_order } },
      }))
    );
    res.json(await listAll());
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/prompts/restore-defaults — re-add built-in presets that were deleted,
// leaving everything the admin has added or edited untouched.
router.post("/restore-defaults", async (_req, res) => {
  try {
    const existing = await PromptPreset.find({}, "group label");
    const seen = new Set(existing.map((p) => `${p.group}::${p.label.toLowerCase()}`));
    const missing = DEFAULT_PROMPTS.filter(
      (d) => !seen.has(`${d.group}::${d.label.toLowerCase()}`)
    );
    if (missing.length) await PromptPreset.insertMany(missing);
    res.json({ restored: missing.length, presets: await listAll() });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/prompts — create a preset (appended to the end of its group)
router.post("/", async (req, res) => {
  const { error, data } = parseBody(req.body);
  if (error) return res.status(400).json({ message: error });
  try {
    if (data.sort_order === undefined) {
      const last = await PromptPreset.findOne({ group: data.group }).sort("-sort_order");
      data.sort_order = last ? last.sort_order + 1 : 0;
    }
    const preset = await PromptPreset.create(data);
    res.status(201).json(mapPreset(preset));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PUT /api/prompts/:id — update a preset
router.put("/:id", async (req, res) => {
  const { error, data } = parseBody(req.body, { partial: true });
  if (error) return res.status(400).json({ message: error });
  try {
    const preset = await PromptPreset.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!preset) return res.status(404).json({ message: "Prompt not found" });
    res.json(mapPreset(preset));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/prompts/:id/toggle — show/hide without deleting
router.patch("/:id/toggle", async (req, res) => {
  const { is_active } = req.body;
  if (typeof is_active !== "boolean") {
    return res.status(400).json({ message: "is_active must be a boolean" });
  }
  try {
    const preset = await PromptPreset.findByIdAndUpdate(req.params.id, { is_active }, { new: true });
    if (!preset) return res.status(404).json({ message: "Prompt not found" });
    res.json(mapPreset(preset));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /api/prompts/:id
router.delete("/:id", async (req, res) => {
  try {
    const preset = await PromptPreset.findByIdAndDelete(req.params.id);
    if (!preset) return res.status(404).json({ message: "Prompt not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
