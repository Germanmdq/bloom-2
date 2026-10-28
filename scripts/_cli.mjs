// Utilidades compartidas por los scripts de administración/exportación.
// No contiene ninguna credencial: todo se lee de .env.local o se pide por consola.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

export function loadServiceClient() {
  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("No encuentro .env.local en la carpeta actual. Corré el script desde la raíz del proyecto.");
    process.exit(1);
  }
  dotenv.config({ path: envPath });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
    process.exit(1);
  }
  console.log(`Proyecto Supabase: ${url}`);
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

/** Pide un texto sin mostrarlo en pantalla (para contraseñas). */
export function askHidden(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk) => {
      for (const c of chunk) {
        if (c === "\r" || c === "\n" || c === "\u0004") {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          return resolve(value);
        }
        if (c === "\u0003") process.exit(1); // Ctrl+C
        if (c === "\u007f" || c === "\b") value = value.slice(0, -1);
        else value += c;
      }
    };
    stdin.on("data", onData);
  });
}

/** Devuelve todos los usuarios de Auth (paginado). */
export async function listAllAuthUsers(supabase) {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

/** Cliente con la clave anon pública, tomada de lib/supabase/env.ts (sin service_role). */
export function loadAnonClient() {
  const src = fs.readFileSync(path.resolve("lib/supabase/env.ts"), "utf8");
  const pick = (name) => src.match(new RegExp(`const ${name}\\s*=\\s*"([^"]+)"`))?.[1];
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || pick("DEFAULT_PROJECT_URL") || "").trim().replace(/\/$/, "");
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || pick("DEFAULT_ANON_KEY") || "").trim();
  if (!url || !key) {
    console.error("No pude obtener la URL/anon key de lib/supabase/env.ts.");
    process.exit(1);
  }
  console.log(`Proyecto Supabase: ${url} (clave anon, solo lectura)`);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
