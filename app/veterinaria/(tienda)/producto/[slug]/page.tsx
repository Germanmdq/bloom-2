import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getPublicCatalog } from "@/lib/vet/server/catalog";
import { recommendFor } from "@/lib/vet/domain/recommendations";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/vet/seo";
import { vetPath } from "@/lib/vet/config/integrations";
import { JsonLd } from "@/components/veterinaria/JsonLd";
import { ProductDetail } from "@/components/veterinaria/store/ProductDetail";
import { displayPrice } from "@/lib/vet/domain/pricing";
import { formatMoney } from "@/lib/vet/domain/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: "Producto no encontrado" };
  const { price } = displayPrice(p);
  const description = `${p.name}${p.subcategory ? ` · ${p.subcategory}` : ""}. ${price != null && !p.requiresConsultation ? `${formatMoney(price)}. ` : ""}Comprá online o consultanos por WhatsApp.`;
  return {
    title: p.name,
    description,
    alternates: { canonical: vetPath(`/producto/${p.slug}`) },
    openGraph: { title: p.name, description, images: p.images[0] ? [{ url: p.images[0] }] : undefined },
  };
}

export default async function ProductoPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const { products, categories, rules } = await getPublicCatalog();
  const category = categories.find((c) => c.id === product.categoryId);
  // Recomendaciones por reglas (el cliente suma "otros también compraron" con datos de ventas).
  const groups = recommendFor(product, products.filter((p) => p.visible), rules, [], 10);

  return (
    <>
      <JsonLd
        data={[
          productJsonLd(product, category),
          breadcrumbJsonLd([
            { name: "Inicio", path: vetPath() },
            { name: "Tienda", path: vetPath("/tienda") },
            ...(category ? [{ name: category.name, path: vetPath(`/tienda/${category.slug}`) }] : []),
            { name: product.name, path: vetPath(`/producto/${product.slug}`) },
          ]),
        ]}
      />
      <ProductDetail initial={product} category={category} categories={categories} groups={groups} />
    </>
  );
}
