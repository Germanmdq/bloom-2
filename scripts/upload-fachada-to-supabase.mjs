/**
 * Sube public/images/bloom-fachada.png al bucket Storage `site` y guarda la URL en app_settings.fachada_image_url.
 *
 * Requiere en .env.local:
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...   (rol service_role del proyecto)
 *
 * Opcional: NEXT_PUBLIC_SUPABASE_URL (por defecto el del proyecto Bloom en código).
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });
config({ path: join(__dirname, "..", ".env") });

const PROJECT_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "https://elvifblvjvcbwabhrlco.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const BUCKET = "site";
const OBJECT_PATH = "bloom-fachada.png";
const LOCAL_FILE = join(__dirname, "..", "public", "images", "bloom-fachada.png");

if (!SERVICE_KEY) {
  console.error(
    "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local (Dashboard → Project Settings → API → service_role)."
  );
  process.exit(1);
}

if (!existsSync(LOCAL_FILE)) {
  console.error("No existe el archivo:", LOCAL_FILE);
  process.exit(1);
}

const supabase = createClient(PROJECT_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const buf = readFileSync(LOCAL_FILE);
const { error: upErr } = await supabase.storage.from(BUCKET).upload(OBJECT_PATH, buf, {
  contentType: "image/png",
  upsert: true,
});

if (upErr) {
  console.error("Error al subir a Storage:", upErr.message);
  process.exit(1);
}

const {
  data: { publicUrl },
} = supabase.storage.from(BUCKET).getPublicUrl(OBJECT_PATH);

const { error: dbErr } = await supabase
  .from("app_settings")
  .update({ fachada_image_url: publicUrl, updated_at: new Date().toISOString() })
  .eq("id", 1);

if (dbErr) {
  console.error("Archivo subido pero error al guardar URL en app_settings:", dbErr.message);
  console.log("URL pública (copiá manualmente si hace falta):", publicUrl);
  process.exit(1);
}

console.log("OK — fachada en Supabase Storage y URL guardada en app_settings.");
console.log(publicUrl);
