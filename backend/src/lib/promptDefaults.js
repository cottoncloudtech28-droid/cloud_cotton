// Seed data for the AI image-editing prompt presets shown in the admin product
// editor and bulk upload page. These used to be hardcoded in the frontend; they
// now live in the database so admins can add, edit and remove them from
// /admin/prompts. This list is only used to seed an empty collection and to
// power "restore defaults" — editing it does not touch presets already saved.

const PROMPT_GROUPS = ["background", "angle", "style"];

// Labels for each group, kept here so the API and the admin UI agree.
const GROUP_LABELS = {
  background: "Background",
  angle: "Angle / framing",
  style: "Full style",
};

const BACKGROUNDS = [
  {
    label: "Cozy bookshelf nook",
    value: "Place the product in front of a warm wooden bookshelf filled with neatly stacked books in muted pastel spines, a small terracotta pot with a succulent and a vintage desk globe softly blurred to the sides, warm daylight falling from the left, the product sits on a light wood surface in the foreground in sharp focus and perfectly centered, cozy reading-nook lifestyle aesthetic, soft natural shadow beneath the product, background gently out of focus so the product stays the clear hero",
  },
  {
    label: "Kids' playroom",
    value: "Place the product on a soft pastel-toned play table inside a cozy kids' playroom, blurred plush toys (a bunny and teddy bears) and wooden alphabet blocks softly out of focus behind it, sheer white curtains and a blush-pink armchair further back, warm natural daylight, dreamy soft-focus lifestyle scene, the product itself stays sharp, centered and clearly the focal point",
  },
  {
    label: "Teen bedroom fairy lights",
    value: "Place the product on a white marble side table in a cozy bedroom scene, a wall behind draped with warm blurred fairy lights and softly out-of-focus framed photo prints, gentle golden bokeh glow, evening ambient lighting, dreamy kawaii teen-bedroom aesthetic, the product stays sharp, centered and the clear focal point against the softly blurred background",
  },
  {
    label: "Café counter with greenery",
    value: "Place the product on a warm marble café counter, softly blurred hanging potted plants and a blurred café interior with warm pendant lighting and out-of-focus patrons in the background, natural daylight spilling in from a nearby window, lifestyle editorial coffee-shop aesthetic, the product stays in sharp focus and centered in the foreground",
  },
  {
    label: "Marble luxury shelf",
    value: "Place the product on a polished white Carrara marble surface with soft grey veining, an elegant blurred backdrop of a champagne-gold wall and a single softly out-of-focus fresh orchid stem to one side, refined directional lighting with a subtle reflection under the product, upscale boutique luxury aesthetic, the product stays sharp, centered and clearly the premium focal point",
  },
  {
    label: "Scandinavian shelf",
    value: "Place the product on a pale birch-wood floating shelf against a matte off-white wall, a softly blurred trailing green pothos plant and a small ceramic vase out of focus to the sides, bright airy diffused daylight, clean minimalist Scandinavian interior aesthetic, gentle natural shadow beneath the product, the product stays sharp, centered and the clear focal point",
  },
  {
    label: "Garden picnic",
    value: "Place the product on a soft checkered cotton picnic blanket spread over sunlit grass, softly blurred wildflowers, a woven wicker basket and dappled greenery out of focus behind it, warm golden-hour sunlight with gentle lens flare, cheerful outdoor lifestyle aesthetic, the product stays sharp, centered and clearly in focus in the foreground",
  },
  {
    label: "Coastal beach",
    value: "Place the product on smooth pale sand near a calm turquoise shoreline, softly blurred rolling waves, a few scattered seashells and beach grass out of focus behind it, bright airy sunlight with a fresh breezy feel, relaxed coastal summer aesthetic, soft natural shadow on the sand, the product stays sharp, centered and the clear hero of the scene",
  },
  {
    label: "Cozy Christmas",
    value: "Place the product on a rustic wooden surface beside a softly blurred decorated Christmas tree with warm twinkling lights, pine sprigs, a red ribbon and out-of-focus wrapped gifts behind it, warm cozy golden bokeh, festive holiday lifestyle aesthetic, the product stays sharp, centered and the clear hero against the softly blurred holiday background",
  },
  {
    label: "Home office desk",
    value: "Place the product on a clean light-oak desk beside a softly blurred laptop, a small potted succulent, a stack of notebooks and a warm desk lamp out of focus behind it, bright natural daylight from a nearby window, tidy modern work-from-home aesthetic, gentle shadow beneath the product, the product stays sharp, centered and clearly in focus",
  },
  {
    label: "Boho macramé",
    value: "Place the product on a woven jute surface against a softly blurred cream macramé wall hanging, trailing green plants and warm terracotta pottery out of focus to the sides, warm earthy natural daylight, relaxed bohemian lifestyle aesthetic, soft natural shadow beneath the product, the product stays sharp, centered and the clear focal point",
  },
  {
    label: "School stationery bokeh",
    value: "Place the product against a minimalist, premium school-inspired background with soft neutral and pastel colors — off-white, warm beige, light sage green, muted sky blue and soft gray — only subtle educational elements like a neatly stacked notebook, a pencil, a small backpack or simple geometric shapes kept distant and softly blurred, realistic shallow depth of field with smooth bokeh, soft diffused natural lighting, matte textures, modern Scandinavian-inspired aesthetic, uncluttered premium commercial composition, a spacious clean central area around the product, ultra-realistic, 8K, no people, no text, no logos, no watermark, the product stays sharp, centered and the clear focal point",
  },
  {
    label: "School luxury catalog",
    value: "Place the product against a minimalist, premium school-inspired background with soft neutral and pastel colors — off-white, warm beige, light sage green, muted sky blue and soft gray — only subtle educational elements like a neatly stacked notebook, a pencil, a small backpack or simple geometric shapes kept distant and softly blurred, realistic shallow depth of field with smooth bokeh, soft diffused natural lighting, matte textures, modern Scandinavian-inspired aesthetic, uncluttered premium commercial composition, a spacious clean central area around the product, ultra-realistic, 8K, no people, no text, no logos, no watermark, the product stays sharp, centered and the clear focal point, luxury e-commerce product photography, seamless gradient backdrop, soft shadows, subtle depth, elegant negative space, muted color palette, refined minimalism, high-end brand aesthetic",
  },
  {
    label: "Modern gym interior",
    value: "Place the product in a high-end modern gym interior with sleek workout equipment, dumbbells, barbells, benches, mirrors, rubber flooring and industrial concrete textures softly blurred behind it with realistic shallow depth of field and bokeh, subtle LED lighting, dramatic yet balanced cool gray, black and metallic tones accented with subtle blue or warm amber highlights, luxurious, energetic and professional feel, ultra-realistic, 8K, studio-quality soft cinematic lighting, a clean well-lit central area around the product, no people, no text, no logos, the product stays sharp, centered and the clear focal point",
  },
  {
    label: "Moody luxury gym",
    value: "Place the product in a high-end modern gym interior with sleek workout equipment, dumbbells, barbells, benches, mirrors, rubber flooring and industrial concrete textures softly blurred behind it with realistic shallow depth of field and bokeh, subtle LED lighting, dramatic yet balanced cool gray, black and metallic tones accented with subtle blue or warm amber highlights, luxurious, energetic and professional feel, ultra-realistic, 8K, studio-quality soft cinematic lighting, a clean well-lit central area around the product, no people, no text, no logos, the product stays sharp, centered and the clear focal point, moody atmosphere, black matte walls, soft volumetric light, premium fitness club ambiance, cinematic bokeh, luxury commercial product photography style",
  },
  {
    label: "Bright fitness studio",
    value: "Place the product in a high-end modern gym interior with sleek workout equipment, dumbbells, barbells, benches, mirrors, rubber flooring and industrial concrete textures softly blurred behind it with realistic shallow depth of field and bokeh, subtle LED lighting, dramatic yet balanced cool gray, black and metallic tones accented with subtle blue or warm amber highlights, luxurious, energetic and professional feel, ultra-realistic, 8K, studio-quality soft cinematic lighting, a clean well-lit central area around the product, no people, no text, no logos, the product stays sharp, centered and the clear focal point, bright modern fitness studio with natural daylight, white and gray interiors, minimal aesthetic, soft background blur, clean commercial advertising style",
  },
];

const ANGLES = [
  { label: "Front", value: "Show the product from a clean straight-on front angle, perfectly centered, e-commerce style, soft even lighting" },
  { label: "3/4 view", value: "Show the product from a flattering 3/4 angle, slightly elevated perspective, soft drop shadow, lifestyle feel" },
  { label: "Top-down", value: "Flat lay top-down view of the product, perfectly centered on a pastel or marble surface, editorial style" },
  { label: "Close-up detail", value: "Tight close-up of the product highlighting its texture and fine detail, shallow depth of field, sharp focus on the material, soft even lighting" },
  { label: "Low angle hero", value: "Show the product from a slightly low hero angle looking up, making it feel bold and premium, soft drop shadow and even lighting, centered" },
  { label: "Side profile", value: "Show the product from a clean side profile angle, centered, revealing its full silhouette, e-commerce style, soft even lighting" },
];

// Style presets replace the whole prompt rather than appending to it, and are
// written per-product — "{product}" is substituted with the product's name.
const STYLES = [
  {
    label: "Cotton Cloud style",
    value: "Aesthetic lifestyle product photo of {product}. Soft pastel room background with warm fairy lights bokeh. Product placed on a white marble surface, centered and well-lit with natural diffused light. Dreamy, kawaii e-commerce aesthetic. Vibrant product colors preserved. No text, no watermark. 1:1 square crop, high resolution.",
  },
  {
    label: "Kawaii studio",
    value: "Studio product photo of {product}, centered 3/4 angle, soft diffused lighting, seamless pastel-pink background (#FDE7F1), subtle drop shadow, kawaii aesthetic, true-to-life colors, 1:1 square, no text, no watermark.",
  },
  {
    label: "Lifestyle flat lay",
    value: "Flat lay lifestyle photo of {product} from directly above. Arranged on a light pastel background with minimal props — dried flowers, washi tape, or small stationery items around it. Soft natural window light, editorial aesthetic. No text, no watermark.",
  },
  {
    label: "Clean white catalog",
    value: "Clean e-commerce catalog photo of {product} on a pure seamless white background (#FFFFFF), centered straight-on, bright even studio lighting, soft natural shadow beneath, true-to-life colors, crisp and sharp, 1:1 square, no props, no text, no watermark.",
  },
  {
    label: "Premium marble",
    value: "Premium product photo of {product} on a polished white marble surface with soft grey veining, elegant champagne-gold blurred backdrop, refined directional lighting with a subtle reflection beneath, upscale boutique aesthetic, true-to-life colors, 1:1 square, no text, no watermark.",
  },
  {
    label: "Festive glow",
    value: "Warm festive product photo of {product} on a rich silk surface surrounded by softly blurred glowing diyas, marigold flowers and golden fairy-light bokeh, celebratory Indian festive aesthetic, product centered and sharply in focus, vibrant true-to-life colors, 1:1 square, no text, no watermark.",
  },
];

// Flattened seed list, each entry ordered within its own group.
const DEFAULT_PROMPTS = [
  ...BACKGROUNDS.map((p, i) => ({ ...p, group: "background", sort_order: i })),
  ...ANGLES.map((p, i) => ({ ...p, group: "angle", sort_order: i })),
  ...STYLES.map((p, i) => ({ ...p, group: "style", sort_order: i })),
];

module.exports = { PROMPT_GROUPS, GROUP_LABELS, DEFAULT_PROMPTS };
