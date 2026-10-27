/**
 * Reemplaza la contraseña de TODOS los clientes (profiles.is_customer = true) por una aleatoria
 * y desconocida, para eliminar el esquema "contraseña = dígitos del teléfono".
 * No cambia ningún otro dato. Los clientes siguen entrando con su teléfono en /acceso
 * (el servidor abre la sesión sin contraseña). No toca al personal ni a los administradores.
 *
 * Uso:  node scripts/rotar-passwords-clientes.mjs            -> simulacro (no cambia nada)
 *       node scripts/rotar-passwords-clientes.mjs --aplicar  -> aplica
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 * Correrlo DESPUÉS de desplegar el nuevo login (las sesiones ya abiertas no se cortan).
 */
import { randomBytes } from "node:crypto";
import { loadServiceClient } from "./_cli.mjs";

const apply = process.argv.includes("--aplicar");
const supabase = loadServiceClient();

const ids = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from("profiles").select("id").eq("is_customer", true).order("id").range(from, from + 999);
  if (error) {
    console.error("No se pudieron leer los clientes:", error.message);
    process.exit(1);
  }
  ids.push(...data.map((r) => r.id));
  if (data.length < 1000) break;
}
console.log(`Clientes encontrados: ${ids.length}${apply ? "" : " (simulacro: no se cambia nada)"}`);

let ok = 0;
let failed = 0;
if (apply) {
  for (const id of ids) {
    const { error } = await supabase.auth.admin.updateUserById(id, { password: randomBytes(32).toString("hex") });
    if (error) {
      failed++;
      console.error(`  ${id}: ${error.message}`);
    } else ok++;
  }
  console.log(`Contraseñas rotadas: ${ok}. Fallidas: ${failed}.`);
} else {
  console.log("Para aplicar: node scripts/rotar-passwords-clientes.mjs --aplicar");
}
