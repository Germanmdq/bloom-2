/**
 * Catálogo semilla de Vida de Perros.
 *
 * `products.json` se genera con `node scripts/vet-import-catalog.mjs catalogo.xlsx`
 * y NO contiene datos internos (costos, proveedores). Acá se expande al
 * modelo completo `Product`.
 */
import type { Product, Species } from "../types";
import raw from "./products.json";
import { SEED_CATEGORIES } from "./categories";

interface CompactProduct {
  c: string;
  n: string;
  k: string;
  s: string;
  sc?: string;
  sp?: string[];
  t?: string[];
  p?: number;
  z?: string;
  h?: number;
  rx?: number;
  /** Variantes: [sku, etiqueta, precio]. */
  v?: [string, string, number | null][];
}

const SEED_DATE = "2026-09-30T00:00:00.000Z";

/** Descripción base por categoría (la dueña puede reemplazarla por producto). */
const CATEGORY_COPY: Record<string, string> = {
  farmacia:
    "Producto de farmacia veterinaria. Antes de usarlo, consultá con nuestro equipo: te indicamos la presentación y la dosis adecuadas para tu mascota según su peso, edad y estado de salud.",
  higiene: "Para el cuidado diario del pelo, la piel y la higiene de tu mascota.",
  paseo: "Para paseos cómodos y seguros. Si tenés dudas con el talle, escribinos y te ayudamos a elegir.",
  juguetes: "Para jugar, entretenerse y gastar energía. Supervisá siempre el juego y revisá el estado del juguete.",
  indumentaria: "Ropa pensada para la comodidad de tu mascota. Consultanos por talles y colores disponibles.",
  comederos: "Para que coma y se hidrate bien, en casa o de paseo.",
  descanso: "Para el descanso y el bienestar en casa.",
  transporte: "Para viajar o ir al veterinario con tranquilidad.",
  regalos: "Un detalle para quienes aman a sus mascotas.",
  otros: "Accesorio para mascotas.",
};

const consultationCategories = new Set(SEED_CATEGORIES.filter((c) => c.requiresConsultation).map((c) => c.id));

export function expandProduct(c: CompactProduct): Product {
  return {
    id: c.c.toLowerCase(),
    slug: c.s,
    code: c.c,
    name: c.n,
    description: CATEGORY_COPY[c.k] ?? undefined,
    categoryId: c.k,
    subcategory: c.sc,
    species: (c.sp ?? []) as Species[],
    tags: c.t ?? [],
    images: [],
    price: c.p ?? null,
    compareAtPrice: null,
    size: c.z,
    variants: (c.v ?? []).map(([sku, label, price]) => ({ id: sku.toLowerCase(), label, price, sku, stock: null })),
    stock: null,
    minStock: 2,
    visible: !c.h,
    requiresConsultation: Boolean(c.rx) || consultationCategories.has(c.k),
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  };
}

let cache: Product[] | null = null;

export function getSeedProducts(): Product[] {
  if (!cache) cache = (raw as unknown as CompactProduct[]).map(expandProduct);
  // Copia para que ningún consumidor mute la semilla compartida.
  return cache.map((p) => ({ ...p, species: [...p.species], tags: [...p.tags], images: [...p.images], variants: p.variants.map((v) => ({ ...v })) }));
}

export { SEED_CATEGORIES };
