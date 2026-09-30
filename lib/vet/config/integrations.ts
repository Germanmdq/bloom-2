/**
 * Integraciones externas. NUNCA se escriben credenciales en el código:
 * todo se lee de variables de entorno (ver `.env.veterinaria.example`).
 *
 * Solo las variables con prefijo NEXT_PUBLIC_ llegan al navegador; las
 * claves secretas (service role, tokens de API) se usan únicamente en
 * rutas de servidor (`app/api/veterinaria/*`).
 *
 * Nota: Next.js reemplaza `process.env.NEXT_PUBLIC_*` en tiempo de build
 * solo cuando se accede con el nombre literal, por eso cada variable se lee
 * explícitamente.
 */

export type VetDataSource = "demo" | "supabase";

function clean(v: string | undefined): string | null {
  return v && v.trim() !== "" ? v.trim() : null;
}

export const INTEGRATIONS = {
  /** "demo" (datos locales en el navegador) o "supabase" (base de datos real). */
  dataSource: (clean(process.env.NEXT_PUBLIC_VET_DATA_SOURCE) === "supabase" ? "supabase" : "demo") as VetDataSource,
  /** URL pública del sitio (SEO, sitemap, Open Graph). */
  siteUrl: (clean(process.env.NEXT_PUBLIC_VET_SITE_URL) ?? clean(process.env.NEXT_PUBLIC_BASE_URL) ?? "http://localhost:3000").replace(/\/$/, ""),
  googleAnalyticsId: clean(process.env.NEXT_PUBLIC_VET_GA_ID),
  googleSiteVerification: clean(process.env.NEXT_PUBLIC_VET_GOOGLE_SITE_VERIFICATION),
  /** API key de Google Maps Embed (opcional; sin ella se usa el embed público por coordenadas). */
  googleMapsEmbedKey: clean(process.env.NEXT_PUBLIC_VET_GOOGLE_MAPS_KEY),
  googleBusinessProfileUrl: clean(process.env.NEXT_PUBLIC_VET_GOOGLE_BUSINESS_URL),
  /** Clave pública VAPID para notificaciones push. */
  vapidPublicKey: clean(process.env.NEXT_PUBLIC_VET_VAPID_PUBLIC_KEY),
  mercadoPagoEnabled: clean(process.env.NEXT_PUBLIC_VET_MERCADOPAGO_ENABLED) === "true",
} as const;

export const isDemoMode = () => INTEGRATIONS.dataSource === "demo";

/** Rutas base del módulo (cambiar acá si se mueve a la raíz o a otro dominio). */
export const VET_BASE = "/veterinaria";
export const VET_ADMIN_BASE = `${VET_BASE}/admin`;

export const vetPath = (p = "") => `${VET_BASE}${p}`;
export const adminPath = (p = "") => `${VET_ADMIN_BASE}${p}`;
