/**
 * Marca el perfil de admin@bloom.com como staff (is_customer: false).
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL (opcional: otros scripts usan fallback al proyecto Bloom)
 *   SUPABASE_SERVICE_ROLE_KEY
 */
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
const ADMIN_EMAIL = "admin@bloom.com";

if (!SERVICE_KEY) {
  console.error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(PROJECT_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (listError) {
  console.error("listUsers error:", listError.message);
  process.exit(1);
}

const admin = listData.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);
console.log("admin id:", admin?.id ?? "(no encontrado)");

if (!admin?.id) {
  console.error(`No hay usuario con email ${ADMIN_EMAIL} en esta página de resultados.`);
  process.exit(1);
}

/** Solo tocar is_customer: un upsert parcial puede anular otras columnas según PostgREST. */
const { data: updated, error: updateError } = await supabase
  .from("profiles")
  .update({ is_customer: false })
  .eq("id", admin.id)
  .select();

if (updateError) {
  console.error("profiles update error:", updateError.message, updateError);
  process.exit(1);
}

if (updated?.length) {
  console.log("profiles update ok:", updated);
  process.exit(0);
}

const { data: inserted, error: insertError } = await supabase
  .from("profiles")
  .insert({ id: admin.id, is_customer: false, full_name: "Admin", role: "ADMIN" })
  .select();

if (insertError) {
  console.error("profiles insert error:", insertError.message, insertError);
  process.exit(1);
}

console.log("profiles insert ok (no había fila):", inserted);
