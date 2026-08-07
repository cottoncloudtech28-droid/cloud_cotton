const mongoose = require("mongoose");
const { PROMPT_GROUPS } = require("../lib/promptDefaults");

// One reusable AI image-editing prompt shown as a clickable chip in the admin
// product editor and bulk upload page. Managed from /admin/prompts.
const promptPresetSchema = new mongoose.Schema(
  {
    group:      { type: String, enum: PROMPT_GROUPS, required: true },
    label:      { type: String, required: true, trim: true, maxlength: 80 },
    value:      { type: String, required: true, trim: true, maxlength: 4000 },
    sort_order: { type: Number, default: 0 },
    is_active:  { type: Boolean, default: true }, // false = hidden from the editors, still editable here
  },
  { timestamps: true }
);

// Every read lists a group in display order.
promptPresetSchema.index({ group: 1, sort_order: 1 });

module.exports = mongoose.model("PromptPreset", promptPresetSchema);
