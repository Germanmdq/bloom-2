/**
 * Sube varias imágenes al bucket menu-images y actualiza categories.image_url.
 *
 * Uso:
 *   node scripts/upload-category-images-batch.mjs [directorio_base]
 *
 * Por defecto directorio_base = <repo>/scripts/uploads
 * Colocá los JPG ahí con los nombres indicados abajo, o pasá la ruta donde estén
 * (p. ej. la carpeta que uses en Cursor con los adjuntos).
 *
 * Requiere: SUPABASE_SERVICE_ROLE_KEY y NEXT_PUBLIC_SUPABASE_URL en .env.local
 */
import { readFileSync, existsSync } from "fs";
import { dirname, extname, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
config({ path: join(repoRoot, ".env.local") });
config({ path: join(repoRoot, ".env") });

const PROJECT_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "https://elvifblvjvcbwabhrlco.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const BUCKET = "menu-images";

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** [nombre exacto en categories.name, nombre de archivo] */
const JOBS = [
  ["Milanesas", "20250611_111515.jpg"],
  ["Desayunos y Meriendas", "20250618_101709.jpg"],
  ["Pastas", "20250731_162930.jpg"],
  ["Pastelería", "20250806_101749.jpg"],
  ["Cafetería", "20250604_122033.jpg"],
];

const baseDir = process.argv[2]?.trim() || join(repoRoot, "scripts", "uploads");
const altDir = "/mnt/user-data/uploads";

function resolveLocalPath(filename) {
  const primary = join(baseDir, filename);
  if (existsSync(primary)) return primary;
  const fallback = join(altDir, filename);
  if (existsSync(fallback)) return fallback;
  return primary;
}

if (!SERVICE_KEY) {
  console.error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(PROJECT_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let ok = 0;
let fail = 0;

for (const [categoryName, filename] of JOBS) {
  const localPath = resolveLocalPath(filename);
  console.log(`\n--- «${categoryName}» ← ${filename} ---`);

  if (!existsSync(localPath)) {
    console.error(`ERROR: Archivo no encontrado. Probá en:\n  ${join(baseDir, filename)}\n  ${join(altDir, filename)}`);
    fail++;
    continue;
  }

  const ext = extname(filename).toLowerCase();
  const contentType = MIME[ext] || "image/jpeg";
  const objectKey = `categories/${filename}`;

  const buf = readFileSync(localPath);
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectKey, buf, {
    contentType,
    upsert: true,
  });

  if (upErr) {
    console.error("ERROR Storage:", upErr.message);
    fail++;
    continue;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(objectKey);

  const { data: updated, error: dbErr } = await supabase
    .from("categories")
    .update({ image_url: publicUrl })
    .eq("name", categoryName.trim())
    .select("id, name, image_url");

  if (dbErr) {
    console.error("ERROR DB:", dbErr.message);
    fail++;
    continue;
  }

  if (!updated?.length) {
    console.error(`ERROR: No hay categoría con name = «${categoryName}».`);
    const { data: names } = await supabase.from("categories").select("name").order("sort_order");
    if (names?.length) {
      console.error("Nombres en DB:", names.map((r) => r.name).join(" | "));
    }
    fail++;
    continue;
  }

  console.log("OK — subido y categories.image_url actualizado.");
  console.log(publicUrl);
  ok++;
}

console.log(`\n=== Fin: ${ok} OK, ${fail} con error ===`);
process.exit(fail > 0 ? 1 : 0);
