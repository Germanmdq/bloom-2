/**
 * Da de alta UN administrador nuevo en Supabase.
 * Pide email y contraseña por consola. No toca ningún usuario existente:
 * si el email ya existe, aborta sin cambiar nada.
 *
 * Uso (desde la raíz del proyecto):  node scripts/crear-admin.mjs
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 */
import { ask, askHidden, listAllAuthUsers, loadServiceClient } from "./_cli.mjs";

const supabase = loadServiceClient();

const email = (await ask("Email del nuevo administrador: ")).toLowerCase();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Email inválido.");
  process.exit(1);
}
const fullName = (await ask("Nombre para mostrar (Enter = Administrador): ")) || "Administrador";
const password = await askHidden("Contraseña (mínimo 12 caracteres): ");
const repeat = await askHidden("Repetí la contraseña: ");
if (password !== repeat) {
  console.error("Las contraseñas no coinciden. No se hizo ningún cambio.");
  process.exit(1);
}
if (password.length < 12) {
  console.error("La contraseña es demasiado corta (mínimo 12). No se hizo ningún cambio.");
  process.exit(1);
}

const existing = (await listAllAuthUsers(supabase)).find((u) => u.email?.toLowerCase() === email);
if (existing) {
  console.error("Ya existe un usuario con ese email. No se modificó nada. Elegí otro email.");
  process.exit(1);
}

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName, role: "ADMIN", is_customer: false },
});
if (error || !data.user) {
  console.error("No se pudo crear el usuario:", error?.message ?? "sin detalle");
  process.exit(1);
}

// El trigger handle_new_user normalmente crea el perfil; el upsert asegura rol y bandera.
// Solo toca la fila del usuario recién creado.
const { error: profileError } = await supabase.from("profiles").upsert(
  { id: data.user.id, full_name: fullName, role: "ADMIN", is_customer: false },
  { onConflict: "id" },
);
if (profileError) {
  console.error(
    `El usuario se creó (id ${data.user.id}) pero falló el perfil: ${profileError.message}\n` +
      "Corregí el perfil a mano (role=ADMIN, is_customer=false) antes de intentar entrar.",
  );
  process.exit(1);
}

console.log(`\nListo. Administrador creado: ${email} (id ${data.user.id}).`);
console.log("Probá entrar en /login con ese email y contraseña antes de desactivar a los viejos.");
