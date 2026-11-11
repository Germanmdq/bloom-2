/**
 * Prioridad: variables en `.env.local` / entorno, si no hay, los mismos valores que ya usa el repo
 * en `scripts/seed-menu.mjs` y el resto de scripts (proyecto `zcgctaqzqcpqopforttc`, Bloom Nuevo).
 */
const DEFAULT_PROJECT_URL = "https://zcgctaqzqcpqopforttc.supabase.co";
const DEFAULT_ANON_KEY = "sb_publishable_HNrP-eOoDNRb17Q0BfmMQQ_hNuFi50h";


export function getSupabaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Bloom usa únicamente Bloom Nuevo. Una variable heredada de Bloom Final no
  // puede reemplazar la URL correcta en un deploy de Vercel.
  return u?.trim() === DEFAULT_PROJECT_URL ? u.trim() : DEFAULT_PROJECT_URL;
}

export function getSupabaseAnonKey(): string {
  // Esta es una clave pública. Mantenerla junto con la URL evita combinar el
  // proyecto nuevo con una anon key vieja configurada en Vercel.
  return DEFAULT_ANON_KEY;
}

/** True si definiste ambas vars en el entorno (override explícito). */
export function isSupabaseEnvExplicit(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}
