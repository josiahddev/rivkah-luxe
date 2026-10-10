// Crop each payment logo's SVG viewBox to the artwork itself, so logos can be
// sized consistently inside the payment badges.
//   node scripts/tighten-payment-icons.mjs
import sharp from "sharp";
import { readFile, writeFile } from "fs/promises";

const dir = new URL("../public/payments/", import.meta.url);
const files = ["visa", "mastercard", "americanexpress", "applepay", "googlepay", "stripe"];

for (const name of files) {
  const url = new URL(`${name}.svg`, dir);
  let svg = await readFile(url, "utf8");
  const vb = svg.match(/viewBox="([^"]+)"/)[1].trim().split(/[\s,]+/).map(Number);
  const [vx, vy, vw, vh] = vb;
  const scale = 2000 / Math.max(vw, vh);
  // Render without any width/height so the viewBox maps 1:1 to the raster.
  // Only the root <svg> loses its width/height — inner shapes keep theirs.
  const stripRoot = (s) => s.replace(/<svg\b[^>]*>/, (tag) => tag.replace(/\s(width|height)="[^"]*"/g, ""));
  const bare = stripRoot(svg).replace("<svg", `<svg width="${vw * scale}" height="${vh * scale}"`);
  const { info } = await sharp(Buffer.from(bare)).trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true });
  const left = -(info.trimOffsetLeft ?? 0) / scale;
  const top = -(info.trimOffsetTop ?? 0) / scale;
  const w = info.width / scale;
  const h = info.height / scale;
  const pad = Math.max(w, h) * 0.01;
  const tight = [vx + left - pad, vy + top - pad, w + pad * 2, h + pad * 2].map((n) => +n.toFixed(3)).join(" ");
  svg = stripRoot(svg).replace(/viewBox="[^"]+"/, `viewBox="${tight}"`);
  await writeFile(url, svg);
  console.log(`${name}: ${vb.join(" ")} → ${tight}  (ratio ${(w / h).toFixed(2)})`);
}
