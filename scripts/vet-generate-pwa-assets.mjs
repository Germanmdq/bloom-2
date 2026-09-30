#!/usr/bin/env node
/**
 * Genera íconos y pantallas de inicio (splash) de la PWA de Vida de Perros.
 *
 * Uso:
 *   npm run vet:pwa-assets                      → usa public/veterinaria/brand/mark.svg
 *   npm run vet:pwa-assets -- ruta/al/logo.png  → usa el logo original
 *
 * Salida: public/veterinaria/icons/*
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const src = path.resolve(process.argv[2] ?? path.join(root, "public/veterinaria/brand/mark.svg"));
const out = path.join(root, "public/veterinaria/icons");
fs.mkdirSync(out, { recursive: true });

const CREAM = "#fbf7f0";
const TEAL = "#147a7f";

async function icon(size, file, { padding = 0.08, background = CREAM } = {}) {
  const inner = Math.round(size * (1 - padding * 2));
  const logo = await sharp(src, { density: 512 }).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(out, file));
}

async function splash(w, h) {
  const size = Math.round(Math.min(w, h) * 0.34);
  const logo = await sharp(src, { density: 512 }).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: w, height: h, channels: 4, background: CREAM } })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(out, `splash-${w}x${h}.png`));
}

await icon(192, "icon-192.png");
await icon(512, "icon-512.png");
// Maskable: zona segura del 80% (Android recorta en círculo/squircle).
await icon(512, "icon-maskable-512.png", { padding: 0.18, background: CREAM });
await icon(180, "apple-touch-icon.png", { padding: 0.1 });
await icon(32, "favicon-32.png", { padding: 0.02 });
await icon(96, "shortcut-96.png", { padding: 0.1, background: TEAL });

// Pantallas de inicio iOS (portrait) más comunes.
export const SPLASHES = [
  [750, 1334], [828, 1792], [1125, 2436], [1170, 2532], [1179, 2556], [1242, 2688], [1284, 2778], [1290, 2796], [1536, 2048], [1668, 2388], [2048, 2732],
];
for (const [w, h] of SPLASHES) await splash(w, h);

console.log(`✔ Íconos y splash generados en ${path.relative(root, out)} desde ${path.relative(root, src)}`);
