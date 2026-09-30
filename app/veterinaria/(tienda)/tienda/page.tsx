import type { Metadata } from "next";
import { getPublicCatalog } from "@/lib/vet/server/catalog";
import { CatalogView } from "@/components/veterinaria/store/CatalogView";
import { JsonLd } from "@/components/veterinaria/JsonLd";
import { breadcrumbJsonLd } from "@/lib/vet/seo";
import { vetPath } from "@/lib/vet/config/integrations";
import { displayPrice } from "@/lib/vet/domain/pricing";

export const metadata: Metadata = {
  title: "Tienda para mascotas",
  description: "Accesorios, ropa, juguetes, higiene, comederos, camas y farmacia veterinaria para perros y gatos. Comprá online con envío o retiro en el local.",
  alternates: { canonical: vetPath("/tienda") },
};

export default async function TiendaPage() {
  const { products, categories } = await getPublicCatalog();
  const visible = products.filter((p) => p.visible);
  // Primer render del servidor: productos con precio primero (el resto se carga en el cliente).
  const initial = [...visible].sort((a, b) => Number(displayPrice(b).price != null) - Number(displayPrice(a).price != null)).slice(0, 24);
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: vetPath() }, { name: "Tienda", path: vetPath("/tienda") }])} />
      <h1 className="font-vet-display text-3xl font-extrabold tracking-[-0.01em]">Tienda</h1>
      <p className="mb-5 mt-1 text-sm text-neutral-600">Todo para el día a día de tu mascota.</p>
      <CatalogView initialProducts={initial} categories={categories} total={visible.length} />
    </div>
  );
}
