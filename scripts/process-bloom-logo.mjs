/**
 * Convierte logo blanco sobre negro → marrón Bloom (#7a765a) sobre transparente.
 * Uso: node scripts/process-bloom-logo.mjs <entrada.png> <salida.png>
 */
import sharp from "sharp";
import { readFileSync } from "fs";

const BROWN = { r: 0x7a, g: 0x76, b: 0x5a };
const BG_CUTOFF = 28; // por debajo = fondo transparente

const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) {
  console.error("Uso: node scripts/process-bloom-logo.mjs <entrada.png> <salida.png>");
  process.exit(1);
}

const buf = readFileSync(input);
const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const out = Buffer.alloc(data.length);

for (let i = 0; i < data.length; i += channels) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const lum = (r + g + b) / 3;

  if (lum <= BG_CUTOFF) {
    out[i] = 0;
    out[i + 1] = 0;
    out[i + 2] = 0;
    out[i + 3] = 0;
    continue;
  }

  // Alpha desde luminancia (anti-alias del blanco sobre negro)
  let a = Math.min(255, Math.round(((lum - BG_CUTOFF) / (255 - BG_CUTOFF)) * 255));
  out[i] = BROWN.r;
  out[i + 1] = BROWN.g;
  out[i + 2] = BROWN.b;
  out[i + 3] = a;
}

await sharp(out, {
  raw: { width, height, channels: 4 },
})
  .png()
  .toFile(output);

console.log("OK →", output);
