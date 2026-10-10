// Renders the demo product photos: clear glass bottles with gold pumps/droppers and
// jars carrying the real Rivkah Luxe label artwork (assets/labels). Products that
// don't have a label file yet get one composed in the same style from the label
// parts (script logo, "Moisturizing Body oil" lettering, vanilla flower).
//   node scripts/render-products.mjs
// Replace with real product photography in the dashboard when available.
import sharp from "sharp";
import { mkdir, readFile } from "fs/promises";

const root = new URL("../", import.meta.url);
const file = (p) => new URL(p, root);
const OUT = "public/demo/products/";
await mkdir(file(OUT), { recursive: true });

const W = 1000, H = 1250;
const b64 = async (p) => `data:image/png;base64,${(await readFile(file(p))).toString("base64")}`;
const pngB64 = (buf) => `data:image/png;base64,${buf.toString("base64")}`;
const img = (href, x, y, w, h, extra = "") =>
  `<image href="${href}" xlink:href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" ${extra.includes("preserveAspectRatio") ? "" : 'preserveAspectRatio="xMidYMid slice"'} ${extra}/>`;

const PART = {
  script: await b64("assets/labels/parts/script-logo.png"),
  moist: await b64("assets/labels/parts/moisturizing-body-oil.png"),
  flower: await b64("assets/labels/parts/vanilla-flower.png"),
};

// ───────── Labels ─────────

/** Compose a white label (750×1350) in the same style as the existing ones. */
async function composeLabel({ line1, line2, tagline, size, art = null, taglineText = null }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="750" height="1350">
    <rect width="750" height="1350" fill="#ffffff"/>
    ${img(PART.script, 180, 70, 390, 260)}
    ${art === "flower" ? img(PART.flower, 255, 345, 240, 240) : ""}
    <text x="375" y="${art ? 690 : 600}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="84" letter-spacing="2" fill="#0d0d0d">${line1}</text>
    ${line2 ? `<text x="375" y="${art ? 790 : 700}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="84" letter-spacing="2" fill="#0d0d0d">${line2}</text>` : ""}
    ${tagline ? img(PART.moist, 85, art ? 820 : 735, 580, 110) : ""}
    ${taglineText ? `<text x="375" y="${art ? 885 : 800}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="64" fill="#a8873f">${taglineText}</text>` : ""}
    <text x="375" y="1150" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="36" fill="#111">${size}</text>
  </svg>`;
  return pngB64(await sharp(Buffer.from(svg)).png().toBuffer());
}

const LABEL = {
  cinnamonKiss: await b64("assets/labels/cinnamon-kiss.png"),
  cinnamonKissGradient: await b64("assets/labels/cinnamon-kiss-gradient.png"),
  peachBloom: await b64("assets/labels/peach-bloom.png"),
  peachBloom189: await b64("assets/labels/peach-bloom-189.png"),
  vanillaCashmere: await b64("assets/labels/vanilla-cashmere.png"),
  vanillaCashmere189: await b64("assets/labels/vanilla-cashmere-189.png"),
  cinnamonDelight: await b64("assets/labels/cinnamon-delight.png"),
  glow: await b64("assets/labels/glow-body-oil.png"),
  vanillaVelvet: await composeLabel({ line1: "VANILLA", line2: "VELVET", tagline: true, size: "8 oz / 237 ml", art: "flower" }),
  scrub: await composeLabel({ line1: "CINNAMON", line2: "KISS", taglineText: "Body Scrub", size: "8 oz / 237 ml" }),
  butter: await composeLabel({ line1: "WHIPPED", line2: "BUTTER", taglineText: "Vanilla Body Butter", size: "8.4 oz / 250 ml", art: "flower" }),
};

// ───────── Scenes ─────────

const BACKDROPS = {
  cream: ["#f6f0e7", "#eadfce", "#d8c7b0"],
  blush: ["#f7ece7", "#ecd7ce", "#d9bdb0"],
  stone: ["#f1efea", "#e0ddd5", "#c8c3b7"],
  sand: ["#f4ebdc", "#e6d4b8", "#cfb48c"],
  noir: ["#2a2420", "#18140f", "#0c0a08"],
};

function defs() {
  return `<defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6e4f17"/><stop offset=".18" stop-color="#c9973b"/><stop offset=".38" stop-color="#fff0c0"/>
      <stop offset=".52" stop-color="#d9ab4c"/><stop offset=".75" stop-color="#9a6f25"/><stop offset="1" stop-color="#5c4012"/>
    </linearGradient>
    <linearGradient id="goldV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2c8" stop-opacity=".9"/><stop offset="1" stop-color="#a87a2c" stop-opacity="0"/></linearGradient>
    <linearGradient id="oil" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#a26a12"/><stop offset=".3" stop-color="#e8b947"/><stop offset=".55" stop-color="#f6d677"/><stop offset=".8" stop-color="#d49a2b"/><stop offset="1" stop-color="#8a560c"/>
    </linearGradient>
    <linearGradient id="cyl" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity=".32"/><stop offset=".12" stop-color="#000" stop-opacity=".08"/><stop offset=".26" stop-color="#fff" stop-opacity=".28"/>
      <stop offset=".34" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".3"/>
    </linearGradient>
    <linearGradient id="whiteJar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#cfc7bb"/><stop offset=".25" stop-color="#ffffff"/><stop offset=".6" stop-color="#f3eee6"/><stop offset="1" stop-color="#bdb4a6"/>
    </linearGradient>
    <linearGradient id="bulb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9d4cc"/><stop offset=".35" stop-color="#ffffff"/><stop offset="1" stop-color="#bfb8ae"/></linearGradient>
    <filter id="blur18" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
    <filter id="blur7" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
    <filter id="blur3"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>`;
}

function backdrop(name, { plinth = true, bokeh = false } = {}) {
  const [a, b, c] = BACKDROPS[name];
  const dark = name === "noir";
  const dots = bokeh
    ? Array.from({ length: 34 }, (_, i) => {
        const x = (i * 271) % W, y = 80 + ((i * 157) % 700), r = 14 + ((i * 37) % 46);
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 3 ? "#e8b94f" : "#fff1c9"}" opacity="${0.08 + (i % 5) * 0.05}" filter="url(#blur7)"/>`;
      }).join("")
    : "";
  return `
  <radialGradient id="bg" cx="50%" cy="36%" r="85%"><stop offset="0" stop-color="${a}"/><stop offset=".65" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>
  <linearGradient id="plinth" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${dark ? "#26211c" : "#d6cbbb"}"/><stop offset=".45" stop-color="${dark ? "#4a4038" : "#f6f1e9"}"/><stop offset="1" stop-color="${dark ? "#191511" : "#c5b7a3"}"/>
  </linearGradient>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${dots}
  ${plinth ? `
  <ellipse cx="500" cy="1060" rx="360" ry="50" fill="#000" opacity="${dark ? 0.55 : 0.18}" filter="url(#blur18)"/>
  <rect x="170" y="1010" width="660" height="70" fill="url(#plinth)"/>
  <ellipse cx="500" cy="1080" rx="330" ry="34" fill="${dark ? "#15120f" : "#c3b49f"}"/>
  <rect x="170" y="1010" width="660" height="70" fill="url(#plinth)"/>
  <ellipse cx="500" cy="1010" rx="330" ry="36" fill="${dark ? "#352e28" : "#faf6f0"}"/>` : ""}`;
}

/** Clear glass pump bottle with gold oil and the label wrapped on the front. */
function pumpBottle({ label, cx = 500, base = 1010, s = 1.12, oil = "url(#oil)" }) {
  const w = 340 * s, h = 600 * s, x = cx - w / 2, y = base - h, r = 34 * s;
  const lw = 290 * s, lh = lw / 0.5556, lx = cx - lw / 2, ly = y + (h - lh) / 2 + 6 * s;
  const id = `c${Math.round(cx)}${Math.round(s * 100)}`;
  return `
  <clipPath id="${id}"><rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="${6 * s}"/></clipPath>
  <ellipse cx="${cx}" cy="${base + 2}" rx="${w * 0.55}" ry="${16 * s}" fill="#000" opacity=".35" filter="url(#blur7)"/>
  <!-- glass + oil -->
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${oil}"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h * 0.12}" rx="${r}" fill="url(#goldV)" opacity=".55"/>
  <rect x="${x + 4 * s}" y="${base - 26 * s}" width="${w - 8 * s}" height="${20 * s}" rx="${10 * s}" fill="#fff6d8" opacity=".35"/>
  <!-- label -->
  <g clip-path="url(#${id})">${img(label, lx, ly, lw, lh)}<rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" fill="url(#cyl)"/></g>
  <!-- glass highlights -->
  <rect x="${x + w * 0.06}" y="${y + 20 * s}" width="${w * 0.045}" height="${h - 40 * s}" rx="${8 * s}" fill="#fff" opacity=".45"/>
  <rect x="${x + w * 0.9}" y="${y + 30 * s}" width="${w * 0.03}" height="${h - 60 * s}" rx="${6 * s}" fill="#fff" opacity=".22"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="${3 * s}"/>
  <!-- gold collar, neck & pump -->
  <rect x="${cx - 120 * s}" y="${y - 30 * s}" width="${240 * s}" height="${40 * s}" rx="${12 * s}" fill="url(#gold)"/>
  <rect x="${cx - 78 * s}" y="${y - 120 * s}" width="${156 * s}" height="${96 * s}" rx="${10 * s}" fill="url(#gold)"/>
  ${[0, 1, 2, 3, 4].map((i) => `<rect x="${cx - 78 * s}" y="${y - 108 * s + i * 17 * s}" width="${156 * s}" height="${2.5 * s}" fill="#6e4f17" opacity=".35"/>`).join("")}
  <rect x="${cx - 26 * s}" y="${y - 175 * s}" width="${52 * s}" height="${60 * s}" fill="url(#gold)"/>
  <path d="M${cx - 70 * s} ${y - 232 * s} h${140 * s} q${10 * s} 0 ${10 * s} ${10 * s} v${50 * s} h-${160 * s} v-${50 * s} q0 -${10 * s} ${10 * s} -${10 * s}z" fill="url(#gold)"/>
  <path d="M${cx + 75 * s} ${y - 226 * s} h${120 * s} q${14 * s} 0 ${14 * s} ${14 * s} v${8 * s} h-${134 * s}z" fill="url(#gold)"/>
  <rect x="${cx - 60 * s}" y="${y - 228 * s}" width="${14 * s}" height="${44 * s}" rx="${4 * s}" fill="#fff" opacity=".45"/>`;
}

/** Clear glass dropper bottle (face oil) with gold collar and white bulb; text printed on the glass. */
function dropperBottle({ cx = 500, base = 1010, s = 1, name = "Radiance Oil" }) {
  const w = 300 * s, h = 360 * s, x = cx - w / 2, y = base - h;
  return `
  <ellipse cx="${cx}" cy="${base + 2}" rx="${w * 0.55}" ry="${14 * s}" fill="#000" opacity=".35" filter="url(#blur7)"/>
  <path d="M${x} ${y + 90 * s} Q${x} ${y} ${cx - 50 * s} ${y - 6 * s} L${cx + 50 * s} ${y - 6 * s} Q${x + w} ${y} ${x + w} ${y + 90 * s} L${x + w} ${base - 30 * s} Q${x + w} ${base} ${x + w - 30 * s} ${base} L${x + 30 * s} ${base} Q${x} ${base} ${x} ${base - 30 * s}Z" fill="url(#oil)"/>
  <path d="M${x} ${y + 90 * s} Q${x} ${y} ${cx - 50 * s} ${y - 6 * s} L${cx + 50 * s} ${y - 6 * s} Q${x + w} ${y} ${x + w} ${y + 90 * s} L${x + w} ${y + 120 * s} L${x} ${y + 120 * s}Z" fill="#fff8e2" opacity=".45"/>
  <rect x="${x + w * 0.08}" y="${y + 70 * s}" width="${w * 0.05}" height="${h - 110 * s}" rx="${8 * s}" fill="#fff" opacity=".5"/>
  <rect x="${x + w * 0.88}" y="${y + 80 * s}" width="${w * 0.03}" height="${h - 130 * s}" rx="${6 * s}" fill="#fff" opacity=".25"/>
  <text x="${cx}" y="${y + 190 * s}" text-anchor="middle" font-family="Georgia, serif" font-size="${56 * s}" fill="#fffaf0">Rivkah</text>
  <text x="${cx}" y="${y + 232 * s}" text-anchor="middle" font-family="Georgia, serif" font-size="${26 * s}" letter-spacing="${10 * s}" fill="#fffaf0">LUXE</text>
  <text x="${cx}" y="${y + 290 * s}" text-anchor="middle" font-family="Georgia, serif" font-size="${30 * s}" fill="#fffaf0">${name}</text>
  <rect x="${cx - 62 * s}" y="${y - 96 * s}" width="${124 * s}" height="${94 * s}" rx="${10 * s}" fill="url(#gold)"/>
  ${[0, 1, 2, 3].map((i) => `<rect x="${cx - 62 * s}" y="${y - 84 * s + i * 20 * s}" width="${124 * s}" height="${2.5 * s}" fill="#6e4f17" opacity=".3"/>`).join("")}
  <path d="M${cx - 44 * s} ${y - 96 * s} v-${70 * s} q0 -${46 * s} ${44 * s} -${46 * s} q${44 * s} 0 ${44 * s} ${46 * s} v${70 * s}z" fill="url(#bulb)"/>
  <rect x="${cx - 30 * s}" y="${y - 190 * s}" width="${12 * s}" height="${70 * s}" rx="${6 * s}" fill="#fff" opacity=".8"/>`;
}

/** White jar with gold lid (cream / butter / scrub) and the label on the front. */
function jar({ cx = 500, base = 1010, s = 1, label = null, title = "Glow Cream", script = false, sub = "" }) {
  const w = 460 * s, h = 250 * s, x = cx - w / 2, y = base - h, lidH = 96 * s;
  const lw = w * 0.86, lh = h * 0.62, lx = cx - lw / 2, ly = y + h * 0.2;
  const id = `j${Math.round(cx)}${Math.round(s * 100)}`;
  return `
  <clipPath id="${id}"><rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="${4 * s}"/></clipPath>
  <ellipse cx="${cx}" cy="${base + 2}" rx="${w * 0.55}" ry="${16 * s}" fill="#000" opacity=".35" filter="url(#blur7)"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${22 * s}" fill="url(#whiteJar)"/>
  ${
    label
      ? `<g clip-path="url(#${id})">${img(label, lx, ly - lh * 0.55, lw, lw / 0.5556, `preserveAspectRatio="xMidYMin meet"`)}<rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" fill="url(#cyl)" opacity=".7"/></g>`
      : `<rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" fill="#ffffff"/>
         <line x1="${lx + 14 * s}" y1="${ly + 10 * s}" x2="${lx + lw - 14 * s}" y2="${ly + 10 * s}" stroke="#c9a24f" stroke-width="${2 * s}"/>
         <line x1="${lx + 14 * s}" y1="${ly + lh - 10 * s}" x2="${lx + lw - 14 * s}" y2="${ly + lh - 10 * s}" stroke="#c9a24f" stroke-width="${2 * s}"/>
         ${script
           ? `${img(PART.script, cx - lh * 0.42 * 1.5 / 2, ly + lh * 0.06, lh * 0.42 * 1.5, lh * 0.42, 'preserveAspectRatio="xMidYMid meet"')}
              <text x="${cx}" y="${ly + lh * 0.66}" text-anchor="middle" font-family="Georgia, serif" font-weight="bold" font-size="${30 * s}" letter-spacing="${2 * s}" fill="#0d0d0d">${sub}</text>
              <text x="${cx}" y="${ly + lh * 0.86}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="${28 * s}" fill="#a8873f">${title}</text>`
           : `<text x="${cx}" y="${ly + lh * 0.42}" text-anchor="middle" font-family="Georgia, serif" font-size="${52 * s}" fill="#b8913f">Rivkah</text>
              <text x="${cx}" y="${ly + lh * 0.62}" text-anchor="middle" font-family="Georgia, serif" font-size="${22 * s}" letter-spacing="${8 * s}" fill="#b8913f">LUXE</text>
              <text x="${cx}" y="${ly + lh * 0.85}" text-anchor="middle" font-family="Georgia, serif" font-size="${32 * s}" fill="#3a332c">${title}</text>`}
         <rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" fill="url(#cyl)" opacity=".6"/>`
  }
  <rect x="${x + w * 0.05}" y="${y + 18 * s}" width="${w * 0.03}" height="${h - 36 * s}" rx="${6 * s}" fill="#fff" opacity=".7"/>
  <rect x="${x - 10 * s}" y="${y - lidH + 8 * s}" width="${w + 20 * s}" height="${lidH}" rx="${16 * s}" fill="url(#gold)"/>
  <rect x="${x - 10 * s}" y="${y - lidH + 8 * s}" width="${w + 20 * s}" height="${18 * s}" rx="${9 * s}" fill="#fff6d6" opacity=".5"/>
  <rect x="${x - 10 * s}" y="${y + 2 * s}" width="${w + 20 * s}" height="${6 * s}" fill="#6e4f17" opacity=".35"/>`;
}

function giftBox(items) {
  return `
  <linearGradient id="boxFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d1a17"/><stop offset="1" stop-color="#0a0908"/></linearGradient>
  <linearGradient id="boxTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2d2925"/><stop offset="1" stop-color="#141210"/></linearGradient>
  <ellipse cx="500" cy="1092" rx="410" ry="24" fill="#000" opacity=".35" filter="url(#blur7)"/>
  <rect x="120" y="830" width="760" height="255" fill="url(#boxFront)"/>
  <path d="M120 830 L190 770 L810 770 L880 830Z" fill="url(#boxTop)"/>
  <text x="500" y="965" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="70" fill="#d8bf8c">Rivkah Luxe</text>
  <text x="500" y="1015" text-anchor="middle" font-family="Georgia, serif" font-size="19" letter-spacing="11" fill="#bfb5a6">GLOW IN LUXURY</text>
  ${items}`;
}

const scene = (bg, body, opts) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs()}${backdrop(bg, opts)}${body}</svg>`;

const scenes = {
  "cinnamon-kiss-oil": scene("sand", pumpBottle({ label: LABEL.cinnamonKiss })),
  "cinnamon-kiss-oil-2": scene("noir", pumpBottle({ label: LABEL.cinnamonKissGradient, s: 0.82, cx: 350 }) + pumpBottle({ label: LABEL.cinnamonKiss, s: 0.66, cx: 660 }), { bokeh: true }),
  "peach-bloom-oil": scene("blush", pumpBottle({ label: LABEL.peachBloom })),
  "peach-bloom-oil-2": scene("cream", pumpBottle({ label: LABEL.peachBloom, s: 0.82, cx: 360 }) + pumpBottle({ label: LABEL.peachBloom189, s: 0.66, cx: 660 })),
  "vanilla-cashmere-oil": scene("cream", pumpBottle({ label: LABEL.vanillaCashmere })),
  "vanilla-cashmere-oil-2": scene("noir", pumpBottle({ label: LABEL.vanillaCashmere, s: 0.82, cx: 360 }) + pumpBottle({ label: LABEL.vanillaCashmere189, s: 0.66, cx: 660 }), { bokeh: true }),
  "vanilla-velvet-oil": scene("noir", pumpBottle({ label: LABEL.vanillaVelvet }), { bokeh: true }),
  "vanilla-velvet-oil-2": scene("stone", pumpBottle({ label: LABEL.vanillaVelvet })),
  "cinnamon-delight-oil": scene("sand", pumpBottle({ label: LABEL.cinnamonDelight })),
  "glow-body-oil": scene("stone", pumpBottle({ label: LABEL.glow })),
  "radiance-face-oil": scene("stone", dropperBottle({ s: 1.5 })),
  "radiance-face-oil-2": scene("noir", dropperBottle({ s: 1.1, cx: 600 }) + jar({ s: 0.62, cx: 330, title: "Glow Cream" }), { bokeh: true }),
  "glow-cream": scene("cream", jar({ title: "Glow Cream", s: 1.4 })),
  "glow-cream-2": scene("noir", jar({ title: "Glow Cream", s: 0.8, cx: 380 }) + dropperBottle({ s: 0.85, cx: 700 }), { bokeh: true }),
  "cinnamon-kiss-scrub": scene("sand", jar({ script: true, sub: "CINNAMON KISS", title: "Body Scrub", s: 1.4 })),
  "cinnamon-kiss-scrub-2": scene("noir", jar({ script: true, sub: "CINNAMON KISS", title: "Body Scrub", s: 0.85 }), { bokeh: true }),
  "whipped-body-butter": scene("cream", jar({ script: true, sub: "WHIPPED VANILLA", title: "Body Butter", s: 1.4 })),
  "whipped-body-butter-2": scene("blush", jar({ script: true, sub: "WHIPPED VANILLA", title: "Body Butter", s: 0.85 })),
  "signature-gift-set": scene(
    "cream",
    giftBox(
      pumpBottle({ label: LABEL.cinnamonKiss, s: 0.5, cx: 320, base: 800 }) +
        pumpBottle({ label: LABEL.vanillaCashmere, s: 0.56, cx: 500, base: 800 }) +
        pumpBottle({ label: LABEL.peachBloom, s: 0.5, cx: 680, base: 800 }),
    ),
    { plinth: false },
  ),
  "collection-trio": scene(
    "noir",
    pumpBottle({ label: LABEL.vanillaVelvet, s: 0.78, cx: 300 }) + dropperBottle({ s: 0.9, cx: 560 }) + jar({ s: 0.5, cx: 790, title: "Glow Cream" }),
    { bokeh: true },
  ),
};

for (const [name, svg] of Object.entries(scenes)) {
  await sharp(Buffer.from(svg)).webp({ quality: 86 }).toFile(file(`${OUT}${name}.webp`).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
  console.log("✓", name);
}
