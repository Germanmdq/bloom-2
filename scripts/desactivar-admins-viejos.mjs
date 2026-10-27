/**
 * Desactiva (NO borra) administradores viejos, uno por uno y con confirmación.
 * Desactivar = bloquear el login en Supabase Auth (ban). Es reversible:
 *   supabase.auth.admin.updateUserById(id, { ban_duration: "none" })
 * No se elimina ningún usuario, perfil ni dato.
 *
 * Considera "administrador" a cualquier usuario con profiles.role = 'ADMIN'
 * y también a admin@bloom.com (el código de la app le da acceso total por email).
 *
 * Uso (correr SOLO después de comprobar que podés entrar con el admin nuevo):
 *   node scripts/desactivar-admins-viejos.mjs
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 */
import { ask, listAllAuthUsers, loadServiceClient } from "./_cli.mjs";

const LEGACY_ADMIN_EMAIL = "admin@bloom.com";
const BAN_FOREVER = "876000h"; // ~100 años

const supabase = loadServiceClient();

const keepEmail = (await ask("Email del admin NUEVO que debe quedar activo: ")).toLowerCase();
const users = await listAllAuthUsers(supabase);
const keep = users.find((u) => u.email?.toLowerCase() === keepEmail);
if (!keep) {
  console.error("No existe ese usuario. No se hizo ningún cambio.");
  process.exit(1);
}
const { data: keepProfile } = await supabase.from("profiles").select("role, is_customer").eq("id", keep.id).maybeSingle();
if (keepProfile?.role !== "ADMIN" || keepProfile?.is_customer) {
  console.error("Ese usuario no tiene perfil ADMIN. Corré primero crear-admin.mjs. No se hizo ningún cambio.");
  process.exit(1);
}

const { data: adminProfiles, error } = await supabase.from("profiles").select("id, full_name, phone").eq("role", "ADMIN");
if (error) {
  console.error("No se pudieron leer los perfiles:", error.message);
  process.exit(1);
}
const profileById = new Map((adminProfiles ?? []).map((p) => [p.id, p]));

const now = Date.now();
const candidates = users.filter((u) => {
  if (u.id === keep.id) return false;
  const isAdmin = profileById.has(u.id) || u.email?.toLowerCase() === LEGACY_ADMIN_EMAIL;
  const alreadyBanned = u.banned_until && new Date(u.banned_until).getTime() > now;
  return isAdmin && !alreadyBanned;
});

if (candidates.length === 0) {
  console.log("No hay administradores viejos activos para desactivar.");
  process.exit(0);
}

console.log(`\nAdministradores viejos activos (${candidates.length}):`);
for (const u of candidates) {
  const p = profileById.get(u.id);
  console.log(` - ${u.email ?? "(sin email)"} | nombre: ${p?.full_name ?? "-"} | tel: ${p?.phone ?? "-"} | último ingreso: ${u.last_sign_in_at ?? "nunca"} | id: ${u.id}`);
}
console.log("\nVas a confirmar uno por uno. Responder cualquier cosa distinta de 's' lo deja activo.\n");

let disabled = 0;
for (const u of candidates) {
  const answer = (await ask(`¿Desactivar a ${u.email ?? u.id}? (s/N): `)).toLowerCase();
  if (answer !== "s") {
    console.log("  -> se deja activo.");
    continue;
  }
  const { error: banError } = await supabase.auth.admin.updateUserById(u.id, { ban_duration: BAN_FOREVER });
  if (banError) console.error(`  -> ERROR: ${banError.message}`);
  else {
    disabled++;
    console.log("  -> desactivado (no podrá iniciar sesión ni renovar la sesión).");
  }
}

console.log(`\nTerminado. Desactivados: ${disabled} de ${candidates.length}.`);
console.log("Aviso: una sesión ya abierta puede seguir válida hasta ~1 hora (vencimiento del token).");
