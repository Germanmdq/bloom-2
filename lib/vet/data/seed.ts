/**
 * Datos iniciales por colección. El catálogo, las categorías, los servicios
 * y la configuración son REALES (o configurables); clientes, pedidos, turnos,
 * reseñas, cupones y combos son de DEMOSTRACIÓN (`demo: true`).
 */
import type { CollectionName, Collections } from "./repository";
import { getSeedProducts, SEED_CATEGORIES } from "../catalog";
import { SEED_SERVICES } from "../catalog/services";
import { SEED_FAQS, SEED_RECOMMENDATION_RULES, SEED_SHIPPING_ZONES } from "../catalog/settings";
import { generateDemoData, type DemoDataset } from "../demo/generate";

let demo: DemoDataset | null = null;
function demoData(): DemoDataset {
  if (!demo) demo = generateDemoData(getSeedProducts(), SEED_SERVICES);
  return demo;
}

export function seedFor<K extends CollectionName>(name: K, withDemo: boolean): Collections[K][] {
  const d = withDemo ? demoData() : null;
  const map: { [P in CollectionName]: () => Collections[P][] } = {
    products: () => getSeedProducts(),
    categories: () => SEED_CATEGORIES.map((c) => ({ ...c })),
    services: () => SEED_SERVICES.map((s) => ({ ...s, days: [...s.days], hours: s.hours.map((h) => ({ ...h })) })),
    shippingZones: () => SEED_SHIPPING_ZONES.map((z) => ({ ...z })),
    faqs: () => SEED_FAQS.map((f) => ({ ...f })),
    recommendationRules: () => SEED_RECOMMENDATION_RULES.map((r) => ({ ...r })),
    blockedSlots: () => [],
    stockMovements: () => [],
    customers: () => d?.customers ?? [],
    pets: () => d?.pets ?? [],
    orders: () => d?.orders ?? [],
    appointments: () => d?.appointments ?? [],
    waitlist: () => d?.waitlist ?? [],
    carts: () => d?.carts ?? [],
    reviews: () => d?.reviews ?? [],
    coupons: () => d?.coupons ?? [],
    combos: () => d?.combos ?? [],
  };
  return map[name]() as Collections[K][];
}
