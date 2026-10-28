/**
 * Exporta todas las imágenes a export/imagenes/ y genera productos.csv,
 * usando SOLO la URL del proyecto y la clave anon (públicas). No usa service_role.
 *
 *  1. Storage: para cada bucket conocido intenta listar sus archivos con la anon key
 *     y los baja por su URL pública. También baja todo archivo de Storage referenciado
 *     por productos, categorías y la fachada (aunque el listado no lo haya mostrado).
 *     -> export/imagenes/<bucket>/<ruta original>
 *  2. Repo: copia las imágenes del repo (public/ y cualquier otra carpeta)
 *     -> export/imagenes/repo/<ruta relativa>
 *  3. Genera export/imagenes/productos.csv
 *
 * Solo LEE; no modifica nada en Supabase.
 *
 * La URL y la anon key se toman de lib/supabase/env.ts (o de las variables
 * NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY si las definís).
 *
 * Uso (desde la raíz):  node scripts/exportar-imagenes.mjs [bucketExtra ...]
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// ---------- Configuración pública ----------
function readPublicConfig() {
  const src = fs.readFileSync(path.resolve("lib/supabase/env.ts"), "utf8");
  const pick = (name) => src.match(new RegExp(`const ${name}\\s*=\\s*"([^"]+)"`))?.[1];
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || pick("DEFAULT_PROJECT_URL") || "").trim().replace(/\/$/, "");
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || pick("DEFAULT_ANON_KEY") || "").trim();
  if (!url || !key) {
    console.error("No pude obtener la URL/anon key de lib/supabase/env.ts. Corré el script desde la raíz del proyecto.");
    process.exit(1);
  }
  return { url, key };
}

const { url: SUPABASE_URL, key: ANON_KEY } = readPublicConfig();
console.log(`Proyecto Supabase: ${SUPABASE_URL} (clave anon)`);
const supabase = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const OUT = path.resolve("export", "imagenes");
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg|avif|ico)$/i;
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "export", ".vercel"]);
// Buckets que definen las migraciones del repo (public=true salvo invoice-captures).
const KNOWN_BUCKETS = ["menu-images", "site", "avatars", "invoice-captures"];

const stats = { downloaded: 0, failed: 0, copied: 0 };
const failures = [];
fs.mkdirSync(OUT, { recursive: true });

// ---------- Datos de la base (lectura pública) ----------
async function fetchAll(table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).order("id").range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

const categories = await fetchAll("categories", "id, name, image_url");
const products = await fetchAll("products", "id, name, category_id, image_url");
let fachada = null;
{
  const { data } = await supabase.from("app_settings").select("fachada_image_url").eq("id", 1).maybeSingle();
  fachada = data?.fachada_image_url ?? null;
}

// ---------- 1. Storage ----------
const STORAGE_URL_RE = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?#]+)/;
const wanted = new Map(); // "bucket/path" -> { bucket, file }
const addWanted = (bucket, file) => wanted.set(`${bucket}/${file}`, { bucket, file });

const referenced = [...products.map((p) => p.image_url), ...categories.map((c) => c.image_url), fachada].filter(Boolean);
const buckets = new Set([...KNOWN_BUCKETS, ...process.argv.slice(2)]);
for (const u of referenced) {
  const m = u.match(STORAGE_URL_RE);
  if (m) {
    buckets.add(m[1]);
    addWanted(m[1], decodeURIComponent(m[2]));
  }
}

async function listRecursive(bucket, prefix = "") {
  const files = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 100, offset });
    if (error) throw error;
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) files.push(...(await listRecursive(bucket, full)));
      else files.push(full);
    }
    if (data.length < 100) break;
  }
  return files;
}

const bucketReport = []; // { bucket, listed, error }
for (const bucket of buckets) {
  try {
    const files = await listRecursive(bucket);
    files.forEach((f) => addWanted(bucket, f));
    bucketReport.push({ bucket, listed: files.length, error: null });
  } catch (e) {
    bucketReport.push({ bucket, listed: 0, error: e.message });
  }
}

const publicUrl = (bucket, file) =>
  `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(bucket)}/${file.split("/").map(encodeURIComponent).join("/")}`;

const notPublic = new Map(); // bucket -> cantidad de archivos que respondieron 400/401/403/404
for (const { bucket, file } of wanted.values()) {
  const dest = path.join(OUT, bucket, file);
  try {
    const res = await fetch(publicUrl(bucket, file));
    if (!res.ok) {
      if ([400, 401, 403, 404].includes(res.status)) notPublic.set(bucket, (notPublic.get(bucket) ?? 0) + 1);
      throw new Error(`HTTP ${res.status}`);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    stats.downloaded++;
  } catch (e) {
    stats.failed++;
    failures.push(`${bucket}/${file}: ${e.message}`);
  }
}

// ---------- 2. Imágenes del repo ----------
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
    } else if (IMAGE_EXT.test(entry.name)) {
      const src = path.join(dir, entry.name);
      const rel = path.relative(process.cwd(), src);
      try {
        const dest = path.join(OUT, "repo", rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        stats.copied++;
      } catch (e) {
        stats.failed++;
        failures.push(`repo/${rel}: ${e.message}`);
      }
    }
  }
}
walk(process.cwd());

// ---------- 3. CSV de productos ----------
const categoryName = new Map(categories.map((c) => [c.id, c.name]));
const csvCell = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
const toPosix = (p) => p.split(path.sep).join("/");

function resolveImage(imageUrl) {
  if (!imageUrl) return { file: "", estado: "sin_imagen" };
  const m = imageUrl.match(STORAGE_URL_RE);
  if (m) {
    const rel = `${m[1]}/${decodeURIComponent(m[2])}`;
    return { file: rel, estado: fs.existsSync(path.join(OUT, rel)) ? "ok_storage" : "archivo_no_descargado" };
  }
  if (imageUrl.startsWith("/")) {
    const rel = toPosix(path.join("repo", "public", decodeURIComponent(imageUrl.split("?")[0])));
    return { file: rel, estado: fs.existsSync(path.join(OUT, rel)) ? "ok_repo" : "archivo_no_encontrado" };
  }
  return { file: imageUrl, estado: "url_externa" };
}

let withoutImage = 0;
const lines = ["id,nombre,categoria,archivo,estado,image_url_original"];
for (const p of products) {
  const { file, estado } = resolveImage(p.image_url);
  if (estado === "sin_imagen" || estado.startsWith("archivo_no")) withoutImage++;
  lines.push([p.id, p.name, categoryName.get(p.category_id) ?? "", file, estado, p.image_url ?? ""].map(csvCell).join(","));
}
fs.writeFileSync(path.join(OUT, "productos.csv"), "﻿" + lines.join("\n") + "\n", "utf8");

// ---------- Resumen ----------
console.log("\n===== BUCKETS =====");
for (const r of bucketReport) {
  const bajados = [...wanted.values()].filter((w) => w.bucket === r.bucket && fs.existsSync(path.join(OUT, w.bucket, w.file))).length;
  const sinAcceso = notPublic.get(r.bucket) ?? 0;
  const nota = r.error
    ? `no se pudo listar con la anon key (${r.error})`
    : r.listed === 0
      ? "listado vacío (bucket vacío o listado no permitido para anon)"
      : `${r.listed} archivos listados`;
  console.log(` - ${r.bucket}: ${nota}; descargados: ${bajados}${sinAcceso ? `; NO accesibles por URL pública: ${sinAcceso}` : ""}`);
}
const privados = bucketReport.filter((r) => (notPublic.get(r.bucket) ?? 0) > 0 || r.error || r.listed === 0);
if (privados.length) {
  console.log("\nBuckets que no se pudieron leer completos con la anon key (probablemente privados):");
  for (const r of privados) {
    console.log(` * ${r.bucket}: cantidad de archivos NO determinable sin service_role` +
      ((notPublic.get(r.bucket) ?? 0) ? ` (al menos ${notPublic.get(r.bucket)} referenciados que no se pueden bajar)` : ""));
  }
}

console.log("\n===== RESUMEN =====");
console.log(`Descargados de Storage : ${stats.downloaded}`);
console.log(`Copiados del repo      : ${stats.copied}`);
console.log(`Fallidos               : ${stats.failed}`);
console.log(`Productos totales      : ${products.length}`);
console.log(`Productos sin imagen   : ${withoutImage} (sin image_url o con archivo que no se encontró)`);
if (failures.length) {
  const logPath = path.join(OUT, "errores.txt");
  fs.writeFileSync(logPath, failures.join("\n") + "\n");
  console.log(`Detalle de fallos en   : ${logPath}`);
}
console.log(`Salida en              : ${OUT}`);
