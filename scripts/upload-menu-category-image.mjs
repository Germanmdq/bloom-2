/**
 * Sube un archivo local al bucket `menu-images` y guarda la URL pública en categories.image_url
 * donde name coincide exactamente (trim) con el primer argumento.
 *
 * Uso:
 *   node scripts/upload-menu-category-image.mjs "Nombre categoría" ./ruta/foto.jpg
 *
 * Requiere en .env.local:
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 * Opcional: NEXT_PUBLIC_SUPABASE_URL
 */
import { readFileSync, existsSync } from "fs";
import { basename, dirname, extname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });
config({ path: join(__dirname, "..", ".env") });

const PROJECT_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "https://elvifblvjvcbwabhrlco.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const BUCKET = "menu-images";

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function usage() {
  console.error(`Uso:
  node scripts/upload-menu-category-image.mjs "Nombre exacto categoría" ./foto.jpg

El nombre debe coincidir con public.categories.name (espacios al inicio/fin se ignoran).`);
}

const categoryName = process.argv[2];
const fileArg = process.argv[3];

if (!categoryName || !fileArg) {
  usage();
  process.exit(1);
}

if (!SERVICE_KEY) {
  console.error(
    "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local (Dashboard → Project Settings → API → service_role)."
  );
  process.exit(1);
}

const localPath = resolve(process.cwd(), fileArg);
if (!existsSync(localPath)) {
  console.error("No existe el archivo:", localPath);
  process.exit(1);
}

const ext = extname(localPath).toLowerCase();
const contentType = MIME[ext] || "application/octet-stream";
const safeSlug = basename(localPath, ext)
  .replace(/[^a-z0-9]+/gi, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 48);
const objectPath = `categories/${safeSlug || "img"}-${Date.now()}${ext}`;

const supabase = createClient(PROJECT_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const buf = readFileSync(localPath);
const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, buf, {
  contentType,
  upsert: true,
});

if (upErr) {
  console.error("Error al subir a Storage:", upErr.message);
  if (upErr.message?.includes("Bucket not found") || upErr.message?.includes("not found")) {
    console.error(
      "\nAplicá la migración supabase/migrations/20260331130000_menu_images_bucket.sql en el proyecto (o supabase db push)."
    );
  }
  process.exit(1);
}

const {
  data: { publicUrl },
} = supabase.storage.from(BUCKET).getPublicUrl(objectPath);

const trimmed = categoryName.trim();
const { data: updated, error: dbErr } = await supabase
  .from("categories")
  .update({ image_url: publicUrl })
  .eq("name", trimmed)
  .select("id, name");

if (dbErr) {
  console.error("Archivo subido pero error al actualizar categories:", dbErr.message);
  console.log("URL pública (podés pegarla a mano):", publicUrl);
  process.exit(1);
}

if (!updated?.length) {
  console.error(`No hay ninguna fila en categories con name exactamente «${trimmed}».`);
  const { data: names } = await supabase.from("categories").select("name").order("sort_order");
  if (names?.length) {
    console.error("Nombres actuales:");
    for (const row of names) console.error("  -", row.name);
  }
  console.log("\nArchivo ya subido a:", publicUrl);
  process.exit(1);
}

console.log("OK — imagen en Storage y categories.image_url actualizado.");
console.log(trimmed);
console.log(publicUrl);
