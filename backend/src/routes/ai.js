const router = require("express").Router();
const { verifyToken, requireAdmin } = require("../middleware/auth");

// POST /api/ai/describe
router.post("/describe", verifyToken, requireAdmin, async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(501).json({ message: "Set OPENAI_API_KEY in backend/.env to enable AI descriptions" });
  }
  const { name, category, colors, keywords } = req.body;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `Write a cute 1-2 sentence product description for a Cotton Cloud Company kawaii shop item. Product: "${name}", category: "${category}", colors: ${JSON.stringify(colors || [])}.${keywords?.trim() ? ` Keywords/features to highlight: ${keywords.trim()}.` : ""} Make it playful, aesthetic, and appealing to young women. Under 100 words.`,
          },
        ],
      }),
    });
    const data = await response.json();
    const description = data.choices?.[0]?.message?.content?.trim() || "";
    res.json({ description });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/ai/analyze — vision auto-fill: look at the product photo and
// suggest name, category, colors, description, price, background & angle preset
router.post("/analyze", verifyToken, requireAdmin, async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(501).json({ message: "Set OPENAI_API_KEY in backend/.env to enable AI auto-fill" });
  }
  const { image_base64, categories = [], backgrounds = [], angles = [] } = req.body;
  if (!image_base64) return res.status(400).json({ message: "image_base64 is required" });

  const prompt = `You are cataloging a product photo for "Cotton Cloud Company", a kawaii/pastel-aesthetic online shop selling stationery, bottles, tumblers, food jars, toys and quirky accessories.

Look at the product image and return a single JSON object with these exact fields:
- "name": short catchy product title (max 8 words)
- "category": the single best match from this exact list: ${JSON.stringify(categories)}
- "colors": array of 2-4 lowercase color names visible in the product (e.g. "pink", "lilac", "mint")
- "description": a cute, playful 1-2 sentence product description under 100 words, aesthetic and appealing to young women, matching the Cotton Cloud Company kawaii vibe
- "price": an integer, a reasonable INR retail price guess for this kind of item (typically between 99 and 1499)
- "background": the single best match from this exact list: ${JSON.stringify(backgrounds)}
- "angle": the single best match from this exact list: ${JSON.stringify(angles)}

Return ONLY the JSON object, no markdown, no extra text.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: image_base64 } },
            ],
          },
        ],
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "OpenAI analyze failed");
    const raw = data.choices?.[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Could not parse AI response");
    }
    // The model often ignores the "integer" instruction and returns a charm price
    // like 249.79 — round to a whole rupee so the storefront never shows odd paise.
    if (parsed.price != null && parsed.price !== "") {
      const rounded = Math.round(Number(parsed.price));
      parsed.price = Number.isFinite(rounded) ? rounded : undefined;
    }
    res.json(parsed);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Provider implementations ──────────────────────────────────────────────────

// OpenAI gpt-image-1 — instruction-based edit via the Images Edits endpoint.
// quality: "high" renders the fuller, more detailed lifestyle scenes properly instead of
// the softer/cheaper default. input_fidelity: "high" keeps the actual product (shape, print,
// color) accurate instead of letting it drift while the background is reimagined around it.
async function editWithOpenAI(buffer, mime, prompt) {
  const ext = mime.split("/")[1] || "png";
  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("prompt", prompt);
  form.append("size", "1024x1024");
  form.append("quality", "high");
  form.append("input_fidelity", "high");
  form.append("image", new Blob([buffer], { type: mime }), `product.${ext}`);

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "OpenAI image edit failed");
  const out = data.data?.[0]?.b64_json;
  if (!out) throw new Error("OpenAI returned no image");
  return `data:image/png;base64,${out}`;
}

// Google Gemini "Nano Banana" image model — multimodal generateContent
async function editWithGemini(buffer, mime, prompt) {
  const model = "gemini-2.5-flash-image";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: mime, data: buffer.toString("base64") } },
            ],
          },
        ],
      }),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Gemini image edit failed");
  const parts = data.candidates?.[0]?.content?.parts || [];
  const inline = parts.map((p) => p.inlineData || p.inline_data).find((d) => d?.data);
  if (!inline?.data) throw new Error("Gemini returned no image");
  return `data:${inline.mimeType || inline.mime_type || "image/png"};base64,${inline.data}`;
}

// Many source photos show several units of the product at once (e.g. every color
// variant lined up in one shot). Our scene/background prompts are written in the
// singular ("place the product on..."), which nudges image models toward picking
// one hero item and dropping the rest. This clause rides along with every prompt —
// preset or freehand — so a multi-item photo doesn't silently lose items on edit.
const PRESERVE_ALL_ITEMS_CLAUSE =
  "If the original photo shows more than one unit or color variant of the product (e.g. several bottles/items lined up together), keep every single one of them in the edited image, in the same arrangement — do not drop, merge, hide, or reduce the number of items. Only apply the change described below.";

// Source photos are sometimes marketing banners with a headline, tagline, feature
// callouts, logos, etc. burned into the image. None of that belongs on a clean
// e-commerce product photo, so every edit strips it unless the instruction below
// explicitly asks for text.
const NO_TEXT_CLAUSE =
  "Do not include any text, words, letters, taglines, headlines, feature callouts, logos, watermarks, or graphic overlays anywhere in the image — only the product itself and the scene. If the original photo has text or graphic overlays on it, remove them.";

// POST /api/ai/image-edit  — instruction-based product photo editing
// Accepts { image_base64 (data URL) | image_url, prompt, provider: "openai" | "gemini" }
// Returns { image_base64 (data URL) }
router.post("/image-edit", verifyToken, requireAdmin, async (req, res) => {
  const { image_base64, image_url, prompt: rawPrompt, provider = "openai" } = req.body;
  const prompt = rawPrompt ? `${PRESERVE_ALL_ITEMS_CLAUSE}\n${NO_TEXT_CLAUSE}\n\n${rawPrompt}` : rawPrompt;
  if (!prompt) return res.status(400).json({ message: "prompt is required" });
  if (!image_base64 && !image_url) {
    return res.status(400).json({ message: "image_base64 or image_url is required" });
  }

  const useGemini = provider === "gemini";
  const hasKey = useGemini ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
  if (!hasKey) {
    return res.status(501).json({
      message: `Set ${useGemini ? "GEMINI_API_KEY" : "OPENAI_API_KEY"} in backend/.env to enable AI image editing with ${useGemini ? "Gemini" : "OpenAI"}`,
    });
  }

  // Resolve the source image to a binary buffer + mime type
  let buffer, mime;
  try {
    if (image_base64) {
      const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/s.exec(image_base64);
      if (!match) throw new Error("image_base64 must be a base64-encoded image data URL");
      mime = match[1];
      buffer = Buffer.from(match[2], "base64");
    } else {
      const imgRes = await fetch(image_url);
      if (!imgRes.ok) throw new Error(`could not fetch image_url (${imgRes.status})`);
      mime = imgRes.headers.get("content-type") || "image/png";
      buffer = Buffer.from(await imgRes.arrayBuffer());
    }
  } catch (e) {
    return res.status(400).json({ message: `Failed to load source image: ${e.message}` });
  }

  try {
    const dataUrl = useGemini
      ? await editWithGemini(buffer, mime, prompt)
      : await editWithOpenAI(buffer, mime, prompt);
    res.json({ image_base64: dataUrl });
  } catch (e) {
    res.status(502).json({ message: e.message });
  }
});

module.exports = router;
