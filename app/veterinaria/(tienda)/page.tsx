import { getPublicCatalog } from "@/lib/vet/server/catalog";
import { localBusinessJsonLd } from "@/lib/vet/seo";
import { JsonLd } from "@/components/veterinaria/JsonLd";
import { HomeView } from "@/components/veterinaria/store/HomeView";
import { displayPrice } from "@/lib/vet/domain/pricing";
import type { Product } from "@/lib/vet/types";

/** Destacados: productos con precio, variando categorías (round-robin). */
function pickFeatured(products: Product[], limit = 10): Product[] {
  const buckets = new Map<string, Product[]>();
  for (const p of products) {
    if (!p.visible || p.requiresConsultation || displayPrice(p).price == null) continue;
    if (!buckets.has(p.categoryId)) buckets.set(p.categoryId, []);
    buckets.get(p.categoryId)!.push(p);
  }
  for (const list of buckets.values()) list.sort((a, b) => Number(b.featured ?? 0) - Number(a.featured ?? 0) || b.images.length - a.images.length || b.variants.length - a.variants.length);
  const out: Product[] = [];
  const lists = [...buckets.values()];
  for (let i = 0; out.length < limit && lists.some((l) => l.length > i); i++) {
    for (const l of lists) if (l[i] && out.length < limit) out.push(l[i]);
  }
  return out;
}

export default async function VetHome() {
  const catalog = await getPublicCatalog();
  const categories = catalog.categories.filter((c) => c.visible).sort((a, b) => a.order - b.order);
  const counts = Object.fromEntries(categories.map((c) => [c.id, catalog.products.filter((p) => p.visible && p.categoryId === c.id).length]));
  return (
    <>
      <JsonLd data={localBusinessJsonLd(catalog.settings.business, catalog.reviews)} />
      <HomeView
        featured={pickFeatured(catalog.products)}
        categories={categories}
        categoryCounts={counts}
        services={catalog.services.filter((s) => s.visible).sort((a, b) => a.order - b.order)}
        combos={catalog.combos.filter((c) => c.active)}
        coupons={catalog.coupons.filter((c) => c.active && c.public)}
        reviews={catalog.reviews.filter((r) => r.visible).slice(0, 6)}
        faqs={catalog.faqs.filter((f) => f.visible).slice(0, 4)}
        comboProducts={catalog.products.filter((p) => catalog.combos.some((c) => c.items.some((i) => i.productId === p.id)))}
      />
    </>
  );
}
