/**
 * Auditoría de teléfonos de profiles (SOLO LECTURA, no modifica nada).
 *  - Muestra cómo están guardados hoy y a qué formato pasarían (10 dígitos).
 *  - Lista los duplicados (mismo teléfono normalizado en 2 o más perfiles) SIN unificarlos.
 *  - Escribe export/telefonos/auditoria.csv y export/telefonos/duplicados.csv (carpeta ignorada por git).
 *
 * Uso: node --experimental-strip-types scripts/auditar-telefonos.mjs
 *      (en Node 22.6+; en Node 24 alcanza con: node scripts/auditar-telefonos.mjs)
 * Usa la clave anon pública (la misma que hoy lee perfiles); no requiere .env.local.
 */
import fs from "node:fs";
import path from "node:path";
import { loadAnonClient } from "./_cli.mjs";
import { normalizePhone } from "../lib/phone.ts";

const supabase = loadAnonClient();
const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, is_customer, role, balance")
    .order("id")
    .range(from, from + 999);
  if (error) {
    console.error("No se pudieron leer los perfiles:", error.message);
    process.exit(1);
  }
  rows.push(...data);
  if (data.length < 1000) break;
}

const csv = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
const out = path.resolve("export", "telefonos");
fs.mkdirSync(out, { recursive: true });

const summary = { total: rows.length, sinTelefono: 0, yaNormalizado: 0, aCambiar: 0, invalido: 0 };
const audit = ["id,nombre,es_cliente,rol,telefono_actual,telefono_normalizado,estado"];
const byNorm = new Map();

for (const r of rows) {
  const raw = (r.phone ?? "").trim();
  let estado;
  let norm = null;
  if (!raw) {
    estado = "sin_telefono";
    summary.sinTelefono++;
  } else {
    norm = normalizePhone(raw);
    if (!norm) { estado = "invalido"; summary.invalido++; }
    else if (norm === raw) { estado = "ya_normalizado"; summary.yaNormalizado++; }
    else { estado = "a_cambiar"; summary.aCambiar++; }
  }
  audit.push([r.id, r.full_name, r.is_customer, r.role, raw, norm ?? "", estado].map(csv).join(","));
  if (norm) {
    if (!byNorm.has(norm)) byNorm.set(norm, []);
    byNorm.get(norm).push(r);
  }
}
fs.writeFileSync(path.join(out, "auditoria.csv"), "﻿" + audit.join("\n") + "\n");

const dupes = [...byNorm.entries()].filter(([, list]) => list.length > 1);
const dupCsv = ["telefono_normalizado,id,nombre,es_cliente,rol,saldo,telefono_actual"];
for (const [norm, list] of dupes) {
  for (const r of list) dupCsv.push([norm, r.id, r.full_name, r.is_customer, r.role, r.balance ?? 0, r.phone].map(csv).join(","));
}
fs.writeFileSync(path.join(out, "duplicados.csv"), "﻿" + dupCsv.join("\n") + "\n");

console.log("\n===== TELÉFONOS EN profiles =====");
console.log(summary);
console.log(`Teléfonos duplicados (tras normalizar): ${dupes.length} grupos`);
for (const [norm, list] of dupes) {
  console.log(`\n  ${norm}`);
  for (const r of list) {
    console.log(`    - ${r.full_name ?? "(sin nombre)"} | ${r.is_customer ? "cliente" : "STAFF " + r.role} | saldo ${r.balance ?? 0} | guardado como "${r.phone}" | id ${r.id}`);
  }
}
const invalid = rows.filter((r) => r.phone?.trim() && !normalizePhone(r.phone));
if (invalid.length) {
  console.log(`\nTeléfonos que NO se pueden interpretar (${invalid.length}); revisarlos a mano:`);
  for (const r of invalid) console.log(`    - ${r.full_name ?? "(sin nombre)"} | "${r.phone}" | id ${r.id}`);
}
console.log(`\nArchivos: ${path.join(out, "auditoria.csv")} y ${path.join(out, "duplicados.csv")}`);
