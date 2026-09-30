/**
 * Recomendaciones de productos:
 *  1. Manuales por producto (`relatedIds`).
 *  2. Reglas configurables en administración (categoría/tag → categorías/productos).
 *  3. "Otros clientes también compraron": co-ocurrencia en pedidos reales.
 * A medida que haya más pedidos, (3) gana peso automáticamente.
 */
import type { Order, Product, RecommendationRule } from "../types";
import { canPurchase } from "./stock";

function purchasable(p: Product) {
  return p.visible && (canPurchase(p) || p.variants.some((v) => canPurchase(p, v.id)) || p.requiresConsultation);
}

export function alsoBought(productId: string, orders: Order[], products: Product[], limit = 8): Product[] {
  const counts = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "cancelado") continue;
    const ids = new Set(o.items.map((i) => i.productId).filter(Boolean) as string[]);
    if (!ids.has(productId)) continue;
    for (const id of ids) if (id !== productId) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const byId = new Map(products.map((p) => [p.id, p]));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => byId.get(id))
    .filter((p): p is Product => Boolean(p && purchasable(p)))
    .slice(0, limit);
}

export interface RecommendationGroup {
  label: string;
  products: Product[];
}

export function recommendFor(
  product: Product,
  products: Product[],
  rules: RecommendationRule[],
  orders: Order[],
  limit = 8,
): RecommendationGroup[] {
  const groups: RecommendationGroup[] = [];
  const used = new Set([product.id]);
  const take = (list: Product[]) => {
    const out: Product[] = [];
    for (const p of list) {
      if (used.has(p.id) || !purchasable(p)) continue;
      used.add(p.id);
      out.push(p);
      if (out.length >= limit) break;
    }
    return out;
  };
  const byId = new Map(products.map((p) => [p.id, p]));

  if (product.relatedIds?.length) {
    const manual = take(product.relatedIds.map((id) => byId.get(id)).filter(Boolean) as Product[]);
    if (manual.length) groups.push({ label: "Combiná con", products: manual });
  }

  const matching = rules.filter(
    (r) => r.active && (r.whenCategoryIds.includes(product.categoryId) || r.whenTags.some((t) => product.tags.includes(t) || product.name.toLowerCase().includes(t))),
  );
  for (const r of matching) {
    const pool = [
      ...(r.recommendProductIds.map((id) => byId.get(id)).filter(Boolean) as Product[]),
      ...products
        .filter((p) => r.recommendCategoryIds.includes(p.categoryId))
        // Prioriza la misma especie y productos con precio.
        .sort((a, b) => score(b) - score(a)),
    ];
    const list = take(pool);
    if (list.length) groups.push({ label: r.label, products: list });
  }

  const bought = take(alsoBought(product.id, orders, products, limit * 2));
  if (bought.length) groups.push({ label: "Otros clientes también compraron", products: bought });

  if (!groups.length) {
    const same = take(products.filter((p) => p.categoryId === product.categoryId).sort((a, b) => score(b) - score(a)));
    if (same.length) groups.push({ label: "También te puede interesar", products: same });
  }
  return groups;

  function score(p: Product) {
    let s = 0;
    if (p.species.some((x) => product.species.includes(x))) s += 2;
    if (p.price != null || p.variants.some((v) => v.price != null)) s += 1;
    if (p.featured) s += 1;
    if (p.images.length) s += 0.5;
    return s;
  }
}

/** Recomendaciones para el carrito (a partir de todos sus productos). */
export function recommendForCart(cartProductIds: string[], products: Product[], rules: RecommendationRule[], orders: Order[], limit = 6): Product[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const seen = new Set(cartProductIds);
  const out: Product[] = [];
  for (const id of cartProductIds) {
    const p = byId.get(id);
    if (!p) continue;
    for (const g of recommendFor(p, products, rules, orders, limit)) {
      for (const r of g.products) {
        if (seen.has(r.id) || r.requiresConsultation) continue;
        seen.add(r.id);
        out.push(r);
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

export interface RebuyItem {
  product: Product;
  variantId?: string;
  lastBoughtAt: string;
  daysAgo: number;
  times: number;
}

/** "Volver a comprar": productos comprados antes por el cliente, los de consumo frecuente primero. */
export function rebuyList(customerId: string, orders: Order[], products: Product[], consumableCategoryIds: string[], now = new Date()): RebuyItem[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const map = new Map<string, RebuyItem>();
  for (const o of orders) {
    if (o.customerId !== customerId || o.status === "cancelado") continue;
    for (const it of o.items) {
      const p = it.productId ? byId.get(it.productId) : undefined;
      if (!p || !p.visible) continue;
      const prev = map.get(p.id);
      if (!prev || prev.lastBoughtAt < o.createdAt) {
        map.set(p.id, {
          product: p,
          variantId: it.variantId,
          lastBoughtAt: o.createdAt,
          daysAgo: Math.floor((now.getTime() - new Date(o.createdAt).getTime()) / 86_400_000),
          times: (prev?.times ?? 0) + 1,
        });
      } else prev.times++;
    }
  }
  return [...map.values()].sort((a, b) => {
    const ca = consumableCategoryIds.includes(a.product.categoryId) ? 1 : 0;
    const cb = consumableCategoryIds.includes(b.product.categoryId) ? 1 : 0;
    return cb - ca || b.times - a.times || a.daysAgo - b.daysAgo;
  });
}
