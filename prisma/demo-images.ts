// Demo product imagery (rendered by scripts/render-products.mjs). Replace with real
// photography in the dashboard — these are only placeholders for the demo store.
const P = (n: string) => `/demo/products/${n}.webp`;

export const DEMO_PRODUCT_IMAGES: Record<string, string[]> = {
  "radiance-face-oil": [P("radiance-face-oil"), P("radiance-face-oil-2")],
  "cinnamon-kiss-body-oil": [P("cinnamon-kiss-oil"), P("cinnamon-kiss-oil-2")],
  "peach-bloom-body-oil": [P("peach-bloom-oil"), P("peach-bloom-oil-2")],
  "vanilla-cashmere-body-oil": [P("vanilla-cashmere-oil"), P("vanilla-cashmere-oil-2")],
  "vanilla-velvet-body-oil": [P("vanilla-velvet-oil"), P("vanilla-velvet-oil-2")],
  "glow-cream": [P("glow-cream"), P("glow-cream-2")],
  "cinnamon-delight-body-oil": [P("cinnamon-delight-oil")],
  "glow-body-oil": [P("glow-body-oil")],
  "cinnamon-kiss-body-scrub": [P("cinnamon-kiss-scrub"), P("cinnamon-kiss-scrub-2")],
  "whipped-body-butter": [P("whipped-body-butter"), P("whipped-body-butter-2")],
  "signature-gift-set": [P("signature-gift-set"), "/demo/hero-packaging.webp"],
};

export const DEMO_CATEGORY_IMAGES: Record<string, string> = {
  "body-oils": P("peach-bloom-oil"),
  "body-scrubs": P("cinnamon-kiss-scrub"),
  "body-butter": P("whipped-body-butter"),
  skincare: P("radiance-face-oil"),
  "gift-sets": P("signature-gift-set"),
};

export const DEMO_COLLECTION_IMAGES: Record<string, string> = {
  "new-arrivals": P("collection-trio"),
  "valentines-edit": P("cinnamon-kiss-oil-2"),
};

export const DEMO_HOMEPAGE_IMAGES = {
  brandStory: P("collection-trio"),
  social: [P("cinnamon-kiss-oil-2"), P("radiance-face-oil-2"), P("peach-bloom-oil"), P("whipped-body-butter-2"), P("cinnamon-kiss-scrub-2"), "/demo/hero-packaging.webp"],
};

export const GLOW_CREAM = {
  name: "Glow Cream",
  slug: "glow-cream",
  sku: "RL-GLOW-CREAM",
  category: "skincare",
  short: "A rich, silky cream that leaves skin feeling soft and looking radiant.",
  description: "<p>Our Glow Cream melts into skin for lasting softness and a healthy-looking glow. Pair it with Radiance Oil for the full ritual.</p><p><em>Demo product — replace the ingredients with those on your label.</em></p>",
  howToUse: "Massage a small amount onto clean skin morning and night. Patch test before first use.",
  size: "50ml",
  tags: ["cream", "skincare", "glow", "face"],
  variants: [{ name: "50ml", sku: "RL-GLOW-CREAM-50", price: 4200, cost: 1400, stock: 14, weight: 180 }],
};

export const FACE_OIL = {
  name: "Radiance Oil",
  slug: "radiance-face-oil",
  sku: "RL-RAD-FACE",
  category: "skincare",
  short: "A silky, fast-absorbing face oil for a soft, luminous-looking complexion.",
  description:
    "<p>Radiance is our lightweight daily face oil. A few drops press into skin for a soft, dewy finish under makeup or on its own.</p><p><em>Demo product — replace the ingredients with those on your label.</em></p>",
  howToUse: "Warm 2–3 drops between your fingertips and press gently onto clean skin, morning or night. Patch test before first use.",
  size: "30ml",
  tags: ["face oil", "skincare", "glow", "radiance"],
  variants: [{ name: "30ml", sku: "RL-RAD-FACE-30", price: 3800, cost: 1200, stock: 18, weight: 120 }],
};
