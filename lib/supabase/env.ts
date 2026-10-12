/**
 * Prioridad: variables en `.env.local` / entorno, si no hay, los mismos valores que ya usa el repo
 * en `scripts/seed-menu.mjs` y el resto de scripts (proyecto `elvifblvjvcbwabhrlco`).
 */
const DEFAULT_PROJECT_URL = "https://elvifblvjvcbwabhrlco.supabase.co";
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJhc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsdmlmYmx2anZjYndhYmhybGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDUwNjksImV4cCI6MjA4Mzk4MTA2OX0.-qQkxgfz9Sz6c77QLHLo1bELXSAJINrKDJ5ovwBeECY";


export function getSupabaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return u && u.trim() !== "" ? u.trim() : DEFAULT_PROJECT_URL;
}

export function getSupabaseAnonKey(): string {
  const k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return k && k.trim() !== "" ? k.trim() : DEFAULT_ANON_KEY;
}

/** True si definiste ambas vars en el entorno (override explícito). */
export function isSupabaseEnvExplicit(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}
