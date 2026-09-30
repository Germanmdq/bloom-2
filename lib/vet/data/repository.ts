/**
 * Contrato de acceso a datos del módulo Veterinaria.
 *
 * Las pantallas NUNCA hablan directo con localStorage ni con Supabase:
 * usan este contrato. Hay dos implementaciones:
 *   - `LocalRepository`    → modo demo (navegador). Útil para probar sin backend.
 *   - `SupabaseRepository` → base de datos real (PostgreSQL + RLS).
 * Se elige con NEXT_PUBLIC_VET_DATA_SOURCE ("demo" | "supabase").
 */
import type {
  AbandonedCart,
  Appointment,
  BlockedSlot,
  Category,
  Combo,
  Coupon,
  Customer,
  Faq,
  Order,
  Pet,
  Product,
  RecommendationRule,
  Review,
  Service,
  ShippingZone,
  StockMovement,
  VetSettings,
  WaitlistEntry,
} from "../types";
import type { VetDataSource } from "../config/integrations";

export interface Collections {
  products: Product;
  categories: Category;
  services: Service;
  customers: Customer;
  pets: Pet;
  orders: Order;
  appointments: Appointment;
  blockedSlots: BlockedSlot;
  waitlist: WaitlistEntry;
  coupons: Coupon;
  combos: Combo;
  shippingZones: ShippingZone;
  reviews: Review;
  faqs: Faq;
  stockMovements: StockMovement;
  carts: AbandonedCart;
  recommendationRules: RecommendationRule;
}

export type CollectionName = keyof Collections;

export const COLLECTIONS: CollectionName[] = [
  "products", "categories", "services", "customers", "pets", "orders", "appointments", "blockedSlots",
  "waitlist", "coupons", "combos", "shippingZones", "reviews", "faqs", "stockMovements", "carts", "recommendationRules",
];

/** Tablas en Supabase (ver migración SQL). */
export const TABLES: Record<CollectionName, string> = {
  products: "vet_products",
  categories: "vet_categories",
  services: "vet_services",
  customers: "vet_customers",
  pets: "vet_pets",
  orders: "vet_orders",
  appointments: "vet_appointments",
  blockedSlots: "vet_blocked_slots",
  waitlist: "vet_waitlist",
  coupons: "vet_coupons",
  combos: "vet_combos",
  shippingZones: "vet_shipping_zones",
  reviews: "vet_reviews",
  faqs: "vet_faqs",
  stockMovements: "vet_stock_movements",
  carts: "vet_carts",
  recommendationRules: "vet_recommendation_rules",
};

/** Colecciones que ve cualquier visitante (catálogo y contenido público). */
export const PUBLIC_COLLECTIONS: CollectionName[] = [
  "products", "categories", "services", "coupons", "combos", "shippingZones", "reviews", "faqs", "recommendationRules", "blockedSlots",
];

export interface VetRepository {
  readonly mode: VetDataSource;
  list<K extends CollectionName>(name: K): Promise<Collections[K][]>;
  upsert<K extends CollectionName>(name: K, item: Collections[K]): Promise<Collections[K]>;
  upsertMany<K extends CollectionName>(name: K, items: Collections[K][]): Promise<void>;
  remove<K extends CollectionName>(name: K, id: string): Promise<void>;
  getSettings(): Promise<Partial<VetSettings>>;
  saveSettings(settings: VetSettings): Promise<void>;
  /** Notifica cambios hechos desde otra pestaña/dispositivo. Devuelve la función para desuscribirse. */
  subscribe?(onChange: (name: CollectionName | "settings") => void): () => void;
}
