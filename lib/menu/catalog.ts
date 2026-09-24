// Reglas de presentación del menú público:
// - Los combos (productos con "+" en el nombre o en la descripción) se muestran
//   solamente dentro de Promos.
// - Las variantes de café y de té se agrupan en un único ítem "Café" / "Té",
//   usando exclusivamente los productos ya cargados.

export interface MenuVariant {
  productId: string;
  label: string;
  price: number;
  image_url?: string;
}

export interface MenuGroup {
  id: string;
  name: string;
  description: string;
  category_id: string;
  image_url?: string;
  price: number;
  variants: MenuVariant[];
}

export const PROMO_CATEGORY_NAMES = ["promos", "ofertas", "promociones"];
export const VIRTUAL_PROMO_CATEGORY_ID = "cat-promos";

const GROUPS = [
  {
    id: "group-cafe",
    name: "Café",
    description: "Elegí cómo querés tu café.",
    match: /^caf[eé](?=\s|$)/i,
  },
  {
    id: "group-te",
    name: "Té",
    description: "Elegí el tipo de té o mate cocido.",
    match: /^(t[eé]|mate cocido)(?=\s|$)/i,
  },
];

export const isCombo = (p: { name?: string; description?: string | null }) =>
  /\+/.test(p.name ?? "") || /\s\+\s/.test(p.description ?? "");

export const isPromoCategory = (cat: { name?: string }) =>
  PROMO_CATEGORY_NAMES.includes((cat.name ?? "").trim().toLowerCase());

// "Té / Saborizado / Mate Cocido" → ["Té", "Té Saborizado", "Mate Cocido"]
// "Café c/ Leche - Lágrima Doble"  → ["Café c/ Leche", "Lágrima Doble"]
export function splitVariantNames(name: string): string[] {
  const parts = name.split(/\s+[/-]\s+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return [name.trim()];
  const head = parts[0].split(/\s+/)[0];
  return parts.map((part, i) =>
    i > 0 && !/\s/.test(part) ? `${head} ${part.toLowerCase()}` : part
  );
}

/**
 * Devuelve la lista de ítems a mostrar (productos sueltos + grupos Café/Té)
 * y la categoría efectiva de cada uno (los combos pasan a Promos).
 */
export function buildCatalog(categories: any[], products: any[]) {
  const promoCat = categories.find(isPromoCategory);
  const promoCategoryId: string = promoCat?.id ?? VIRTUAL_PROMO_CATEGORY_ID;
  const hasCombos = products.some(isCombo);

  const displayCategories = categories
    .filter((c) => !isPromoCategory(c))
    .concat(promoCat || hasCombos ? [{ id: promoCategoryId, name: "Promos" }] : []);

  const items: any[] = [];
  const groups = new Map<string, MenuGroup>();

  for (const p of products) {
    if (isCombo(p) || p.category_id === promoCategoryId) {
      items.push({ ...p, category_id: promoCategoryId });
      continue;
    }

    const def = GROUPS.find((g) => g.match.test(p.name ?? ""));
    if (!def) {
      items.push(p);
      continue;
    }

    let group = groups.get(def.id);
    if (!group) {
      group = {
        id: def.id,
        name: def.name,
        description: def.description,
        category_id: p.category_id,
        image_url: p.image_url,
        price: Number(p.price) || 0,
        variants: [],
      };
      groups.set(def.id, group);
      items.push(group);
    }
    for (const label of splitVariantNames(p.name)) {
      group.variants.push({
        productId: p.id,
        label,
        price: Number(p.price) || 0,
        image_url: p.image_url,
      });
    }
    group.image_url ||= p.image_url;
    group.price = Math.min(...group.variants.map((v) => v.price));
  }

  return { items, displayCategories, promoCategoryId };
}
