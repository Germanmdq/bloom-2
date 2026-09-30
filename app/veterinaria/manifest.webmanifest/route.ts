/**
 * Manifest de la PWA de Vida de Perros, generado desde la configuración
 * central (nombre, colores) para no duplicar datos.
 */
import { BUSINESS } from "@/lib/vet/config/business";
import { VET_BASE } from "@/lib/vet/config/integrations";

export function GET() {
  const manifest = {
    id: VET_BASE,
    name: `${BUSINESS.name} — Veterinaria, peluquería y pet shop`,
    short_name: BUSINESS.name,
    description: BUSINESS.description,
    lang: "es-AR",
    dir: "ltr",
    start_url: `${VET_BASE}?source=pwa`,
    scope: VET_BASE,
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: BUSINESS.colors.surface,
    theme_color: BUSINESS.colors.primary,
    categories: ["shopping", "lifestyle", "health"],
    icons: [
      { src: `${VET_BASE}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${VET_BASE}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${VET_BASE}/icons/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Reservar turno", short_name: "Turnos", url: `${VET_BASE}/turnos?source=shortcut`, icons: [{ src: `${VET_BASE}/icons/shortcut-96.png`, sizes: "96x96" }] },
      { name: "Tienda", short_name: "Tienda", url: `${VET_BASE}/tienda?source=shortcut`, icons: [{ src: `${VET_BASE}/icons/shortcut-96.png`, sizes: "96x96" }] },
      { name: "Mi cuenta", short_name: "Cuenta", url: `${VET_BASE}/cuenta?source=shortcut`, icons: [{ src: `${VET_BASE}/icons/shortcut-96.png`, sizes: "96x96" }] },
      { name: "Panel de administración", short_name: "Panel", url: `${VET_BASE}/admin?source=shortcut`, icons: [{ src: `${VET_BASE}/icons/shortcut-96.png`, sizes: "96x96" }] },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
