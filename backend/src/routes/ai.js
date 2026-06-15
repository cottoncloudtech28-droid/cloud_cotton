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

// POST /api/ai/image-edit  — requires OpenAI image-edit API
router.post("/image-edit", verifyToken, requireAdmin, (_req, res) => {
  res.status(501).json({
    message: "AI image editing is not yet implemented. Set OPENAI_API_KEY and implement this route using the OpenAI Images API.",
  });
});

module.exports = router;
