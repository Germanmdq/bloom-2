import type { MetadataRoute } from "next";
import { getPublicCatalog } from "@/lib/vet/server/catalog";
import { INTEGRATIONS, vetPath } from "@/lib/vet/config/integrations";

/** Sitemap de Vida de Perros: /veterinaria/sitemap.xml */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, categories, services } = await getPublicCatalog();
  const u = (p: string) => `${INTEGRATIONS.siteUrl}${vetPath(p)}`;
  const now = new Date();
  return [
    { url: u(""), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: u("/tienda"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: u("/servicios"), changeFrequency: "monthly", priority: 0.9 },
    { url: u("/turnos"), changeFrequency: "weekly", priority: 0.8 },
    { url: u("/ubicacion"), changeFrequency: "monthly", priority: 0.8 },
    { url: u("/promociones"), changeFrequency: "weekly", priority: 0.6 },
    { url: u("/preguntas-frecuentes"), changeFrequency: "monthly", priority: 0.5 },
    ...categories.filter((c) => c.visible).map((c) => ({ url: u(`/tienda/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...services.filter((s) => s.visible).map((s) => ({ url: u(`/servicios/${s.slug}`), changeFrequency: "monthly" as const, priority: 0.7 })),
    ...products.filter((p) => p.visible).map((p) => ({ url: u(`/producto/${p.slug}`), lastModified: new Date(p.updatedAt), changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
