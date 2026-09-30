import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MessageCircle } from "lucide-react";
import { getCategoryBySlug, getPublicCatalog } from "@/lib/vet/server/catalog";
import { CatalogView } from "@/components/veterinaria/store/CatalogView";
import { JsonLd } from "@/components/veterinaria/JsonLd";
import { breadcrumbJsonLd } from "@/lib/vet/seo";
import { vetPath } from "@/lib/vet/config/integrations";
import { displayPrice } from "@/lib/vet/domain/pricing";
import { waLink, WA_MESSAGES } from "@/lib/vet/domain/whatsapp";

export async function generateMetadata({ params }: { params: Promise<{ categoria: string }> }): Promise<Metadata> {
  const cat = await getCategoryBySlug((await params).categoria);
  if (!cat) return { title: "Categoría no encontrada" };
  return {
    title: `${cat.name} para mascotas`,
    description: cat.description ?? `${cat.name} para perros y gatos.`,
    alternates: { canonical: vetPath(`/tienda/${cat.slug}`) },
  };
}

export default async function CategoriaPage({ params }: { params: Promise<{ categoria: string }> }) {
  const slug = (await params).categoria;
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();
  const { products, categories, settings } = await getPublicCatalog();
  const inCat = products.filter((p) => p.visible && p.categoryId === cat.id);
  const initial = [...inCat].sort((a, b) => Number(displayPrice(b).price != null) - Number(displayPrice(a).price != null)).slice(0, 24);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: vetPath() }, { name: "Tienda", path: vetPath("/tienda") }, { name: cat.name, path: vetPath(`/tienda/${cat.slug}`) }])} />
      <nav aria-label="Ruta de navegación" className="mb-3 flex items-center gap-1 text-[13px] text-neutral-500">
        <Link href={vetPath("/tienda")} className="hover:text-vet-primary">Tienda</Link>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-vet-ink" aria-current="page">{cat.name}</span>
      </nav>
      <h1 className="font-vet-display text-3xl font-extrabold tracking-[-0.01em]">{cat.name}</h1>
      {cat.description && <p className="mb-4 mt-1 max-w-2xl text-sm text-neutral-600">{cat.description}</p>}
      {cat.requiresConsultation && (
        <div className="mb-5 flex flex-col gap-3 rounded-3xl bg-vet-tint p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm leading-relaxed text-vet-primary-dark">
            <strong>Compra con asesoramiento.</strong> Los productos de farmacia se consultan antes de la venta para indicarte la presentación adecuada. No reemplaza la consulta veterinaria.
          </p>
          <a href={waLink(settings.business.whatsapp, WA_MESSAGES.consultation("un producto de farmacia"))} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#128C4B] px-4 text-sm font-bold text-white">
            <MessageCircle className="size-4" /> Consultar por WhatsApp
          </a>
        </div>
      )}
      <CatalogView initialProducts={initial} categories={categories} category={cat} total={inCat.length} />
    </div>
  );
}
