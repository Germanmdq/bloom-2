/**
 * Sube las fotos de los productos al bucket menu-images y actualiza
 * products.image_url según el archivo .md que indica qué foto va con cada producto.
 *
 * Uso (primero sin --aplicar para revisar qué va a hacer):
 *   node scripts/asignar-fotos-productos.mjs <carpeta_fotos> <mapeo.md>
 *   node scripts/asignar-fotos-productos.mjs <carpeta_fotos> <mapeo.md> --aplicar
 *
 * Ejemplo en Windows:
 *   node scripts/asignar-fotos-productos.mjs ^
 *     "C:\Users\mateo\Documents\Codex\2026-09-24\files-mentioned-by-the-user-menu\outputs\bloom-imagenes-unicas" ^
 *     "C:\Users\mateo\Documents\Codex\2026-09-24\files-mentioned-by-the-user-menu\outputs\bloom-fotos-para-cloud-code-v2.md"
 *
 * El .md puede tener el mapeo como tabla (| Producto | foto.jpg |) o como
 * líneas ("Producto → foto.jpg", "- foto.jpg: Producto"). Cada línea que
 * nombra un archivo de imagen y un producto existente se toma como una asignación.
 *
 * Requiere: SUPABASE_SERVICE_ROLE_KEY en .env.local. Usa la misma base que la
 * app (NEXT_PUBLIC_SUPABASE_URL o, si no está, la de lib/supabase/env.ts).
 */
import { readFileSync, existsSync, readdirSync } from "fs";
import { basename, dirname, extname, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
config({ path: join(repoRoot, ".env.local") });
config({ path: join(repoRoot, ".env") });

const PROJECT_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "https://zcgctaqzqcpqopforttc.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const BUCKET = "menu-images";
const FOLDER = "productos";

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const IMAGE_RE = /[^\s|`'"()\[\]<>]+\.(?:jpe?g|png|webp)\b/gi;

const [photosDir, mappingFile, ...flags] = process.argv.slice(2);
const apply = flags.includes("--aplicar");

if (!photosDir || !mappingFile) {
  console.error("Uso: node scripts/asignar-fotos-productos.mjs <carpeta_fotos> <mapeo.md> [--aplicar]");
  process.exit(1);
}
if (!existsSync(photosDir)) throw new Error(`No existe la carpeta de fotos: ${photosDir}`);
if (!existsSync(mappingFile)) throw new Error(`No existe el archivo de mapeo: ${mappingFile}`);
if (!SERVICE_KEY) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");

const normalize = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const supabase = createClient(PROJECT_URL, SERVICE_KEY, { auth: { persistSession: false } });

const { data: products, error: productsError } = await supabase
  .from("products")
  .select("id, name, image_url");
if (productsError) throw productsError;

const byName = new Map(products.map((p) => [normalize(p.name), p]));

// Archivos de la carpeta, buscables por nombre (sin importar mayúsculas)
const photoFiles = new Map(
  readdirSync(photosDir)
    .filter((f) => MIME[extname(f).toLowerCase()])
    .map((f) => [f.toLowerCase(), f])
);

// Encuentra el producto nombrado en un texto: primero coincidencia exacta de
// alguna celda/fragmento, después el nombre de producto más largo contenido.
function findProduct(text) {
  const fragments = text
    .split(/\||→|->|=>|:|—|–|\t/)
    .map((f) => normalize(f.replace(/^[-*+\d.)\s]+/, "")))
    .filter(Boolean);
  for (const f of fragments) if (byName.has(f)) return [byName.get(f)];
  const whole = normalize(text);
  const contained = products
    .filter((p) => whole.includes(normalize(p.name)))
    .sort((a, b) => b.name.length - a.name.length);
  return contained.length ? [contained[0]] : [];
}

const assignments = new Map(); // product.id → { product, file }
const unmatchedLines = [];
const missingFiles = new Set();

for (const line of readFileSync(mappingFile, "utf8").split(/\r?\n/)) {
  const files = line.match(IMAGE_RE);
  if (!files) continue;
  const text = files.reduce((acc, f) => acc.replace(f, " "), line);
  const found = findProduct(text);
  if (!found.length) {
    unmatchedLines.push(line.trim());
    continue;
  }
  const file = basename(files[0].replace(/\\/g, "/"));
  const local = photoFiles.get(file.toLowerCase());
  if (!local) {
    missingFiles.add(file);
    continue;
  }
  for (const product of found) assignments.set(product.id, { product, file: local });
}

console.log(`\nBase: ${PROJECT_URL}`);
console.log(`\n📋 ${assignments.size} productos con foto asignada:\n`);
for (const { product, file } of assignments.values()) console.log(`   ${product.name}  ←  ${file}`);

if (missingFiles.size) {
  console.log(`\n⚠️  Fotos nombradas en el .md que no están en la carpeta (${missingFiles.size}):`);
  for (const f of missingFiles) console.log(`   ${f}`);
}
if (unmatchedLines.length) {
  console.log(`\n⚠️  Líneas con foto pero sin producto reconocible (${unmatchedLines.length}):`);
  for (const l of unmatchedLines) console.log(`   ${l}`);
}
const withoutPhoto = products.filter((p) => !assignments.has(p.id));
console.log(`\nℹ️  ${withoutPhoto.length} productos quedan con la foto que ya tenían.`);

if (!apply) {
  console.log("\nModo revisión: no se cambió nada. Si está bien, repetí el comando con --aplicar.\n");
  process.exit(0);
}

// El bucket público de fotos del menú (se crea si la base todavía no lo tiene)
const { data: bucket } = await supabase.storage.getBucket(BUCKET);
if (!bucket) {
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (error) throw new Error(`No se pudo crear el bucket ${BUCKET}: ${error.message}`);
  console.log(`🪣 Bucket ${BUCKET} creado`);
}

// Sube cada foto una sola vez aunque la usen varios productos
const publicUrls = new Map();
for (const file of new Set([...assignments.values()].map((a) => a.file))) {
  const path = `${FOLDER}/${file}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, readFileSync(join(photosDir, file)), {
      contentType: MIME[extname(file).toLowerCase()],
      upsert: true,
    });
  if (error) {
    console.error(`❌ No se pudo subir ${file}: ${error.message}`);
    continue;
  }
  publicUrls.set(file, supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  console.log(`⬆️  ${file}`);
}

let updated = 0;
for (const { product, file } of assignments.values()) {
  const url = publicUrls.get(file);
  if (!url) continue;
  const { error } = await supabase.from("products").update({ image_url: url }).eq("id", product.id);
  if (error) console.error(`❌ ${product.name}: ${error.message}`);
  else updated++;
}

console.log(`\n✅ ${updated} productos actualizados con su foto.\n`);
