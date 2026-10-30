/**
 * Crea (o convierte) un administrador identificado por TELÉFONO.
 *  - Si el teléfono ya es una cuenta de cliente: la convierte en ADMIN conservando nombre, dirección,
 *    pedidos y saldo; solo cambia rol, is_customer y contraseña.
 *  - Si no existe: crea el usuario y el perfil ADMIN.
 *  - Si el teléfono está en más de una cuenta: aborta sin cambiar nada.
 * Genera una contraseña temporal fuerte y la muestra UNA sola vez. Cambiala en /dashboard/password.
 *
 * Uso (raíz del proyecto):  node scripts/crear-admin-telefono.mjs 2236151152
 * La clave de servicio se obtiene en el momento con la CLI de Supabase (sesión ya iniciada) o, si existe,
 * de la variable SUPABASE_SERVICE_ROLE_KEY. No se imprime ni se guarda.
 */
import { randomInt } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { normalizePhone, phoneVariants } from "../lib/phone.ts";

const REF = "zcgctaqzqcpqopforttc";
const URL = `https://${REF}.supabase.co`;

const phone = normalizePhone(process.argv[2] ?? "");
if (!phone) { console.error("Teléfono inválido. Uso: node scripts/crear-admin-telefono.mjs 2236151152"); process.exit(1); }

function serviceKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  const out = execFileSync("supabase", ["projects", "api-keys", "--project-ref", REF, "-o", "json"], { encoding: "utf8" });
  const key = JSON.parse(out).find((k) => k.name === "service_role")?.api_key;
  if (!key) throw new Error("No pude obtener la clave de servicio con la CLI de Supabase (¿hiciste `supabase login`?).");
  return key;
}

function strongPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from({ length: 20 }, () => chars[randomInt(chars.length)]).join("");
}

const supabase = createClient(URL, serviceKey(), { auth: { autoRefreshToken: false, persistSession: false } });

const { data: matches, error: lookupError } = await supabase
  .from("profiles").select("id, full_name, role, is_customer").in("phone", phoneVariants(phone));
if (lookupError) { console.error("No pude consultar perfiles:", lookupError.message); process.exit(1); }
if (matches.length > 1) { console.error(`El teléfono figura en ${matches.length} cuentas. No se cambió nada.`); process.exit(1); }

const password = strongPassword();
let userId, name, mode;

if (matches.length === 1) {
  const p = matches[0];
  if (p.is_customer === false && p.role === "ADMIN") mode = "ya era administrador (solo se cambia la contraseña)";
  else mode = "cuenta de cliente convertida en administrador (se conservan tus datos)";
  userId = p.id; name = p.full_name;
  const { error: e1 } = await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true });
  if (e1) { console.error("No pude cambiar la contraseña:", e1.message); process.exit(1); }
  const { error: e2 } = await supabase.from("profiles").update({ role: "ADMIN", is_customer: false, phone }).eq("id", userId);
  if (e2) { console.error("La contraseña cambió pero falló el perfil:", e2.message, "\nCorregí a mano role=ADMIN, is_customer=false."); process.exit(1); }
} else {
  mode = "cuenta de administrador nueva"; name = "Administrador";
  const { data, error } = await supabase.auth.admin.createUser({
    email: `${phone}@staff.bloom.local`, password, email_confirm: true, user_metadata: { full_name: name },
  });
  if (error || !data.user) { console.error("No pude crear el usuario:", error?.message); process.exit(1); }
  userId = data.user.id;
  const { error: e2 } = await supabase.from("profiles").upsert(
    { id: userId, full_name: name, phone, role: "ADMIN", is_customer: false }, { onConflict: "id" });
  if (e2) { console.error("El usuario se creó pero falló el perfil:", e2.message); process.exit(1); }
}

// Verificación: el login por contraseña funciona de verdad.
const { data: u } = await supabase.auth.admin.getUserById(userId);
const anon = createClient(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_HNrP-eOoDNRb17Q0BfmMQQ_hNuFi50h", { auth: { persistSession: false } });
const { error: loginError } = await anon.auth.signInWithPassword({ email: u.user.email, password });

// Verificación contra producción: el mismo endpoint que usa la pantalla /acceso.
let prodResult;
try {
  const res = await fetch("https://bloom-2-drab.vercel.app/api/auth/staff-login", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone, password }),
  });
  prodResult = res.ok ? "OK" : `FALLÓ (HTTP ${res.status}: ${(await res.json().catch(() => ({}))).error ?? "sin detalle"})`;
} catch (e) { prodResult = `FALLÓ (${e.message})`; }

console.log(`\n${mode}: ${name} (${phone})`);
console.log(loginError ? `ATENCIÓN: la verificación de login falló: ${loginError.message}` : "Verificación de login (Supabase): OK");
console.log(`Verificación en producción (/api/auth/staff-login): ${prodResult}`);
console.log("\nIngresá en https://bloom-2-drab.vercel.app/acceso con tu teléfono y esta contraseña:");
console.log(`\n   CONTRASEÑA_TEMPORAL=${password}\n`);
console.log("Se muestra una sola vez. Cambiala en https://bloom-2-drab.vercel.app/dashboard/password");
