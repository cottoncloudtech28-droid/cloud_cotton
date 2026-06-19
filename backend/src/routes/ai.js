const router = require("express").Router();
const { verifyToken, requireAdmin } = require("../middleware/auth");

// POST /api/ai/describe
router.post("/describe", verifyToken, requireAdmin, async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(501).json({ message: "Set OPENAI_API_KEY in backend/.env to enable AI descriptions" });
  }
  const { name, category, colors } = req.body;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Write a cute 1-2 sentence product description for a kawaii shop item. Product: "${name}", category: "${category}", colors: ${JSON.stringify(colors || [])}. Keep it playful and under 100 words.`,
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

// ── Provider implementations ──────────────────────────────────────────────────

// OpenAI gpt-image-1 — instruction-based edit via the Images Edits endpoint
async function editWithOpenAI(buffer, mime, prompt) {
  const ext = mime.split("/")[1] || "png";
  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("prompt", prompt);
  form.append("size", "1024x1024");
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

// POST /api/ai/image-edit  — instruction-based product photo editing
// Accepts { image_base64 (data URL) | image_url, prompt, provider: "openai" | "gemini" }
// Returns { image_base64 (data URL) }
router.post("/image-edit", verifyToken, requireAdmin, async (req, res) => {
  const { image_base64, image_url, prompt, provider = "openai" } = req.body;
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
