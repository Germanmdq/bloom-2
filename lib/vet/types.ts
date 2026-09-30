/**
 * Modelo de dominio del módulo Veterinaria + Pet Shop.
 *
 * Cada interfaz corresponde a una colección independiente del repositorio
 * (ver `lib/vet/data/repository.ts`) y a una tabla `vet_*` en Supabase
 * (ver `supabase/migrations/20260930120000_veterinaria_module.sql`).
 */

export type ID = string;
/** Fecha/hora ISO 8601. */
export type ISODate = string;

export type Species =
  | "perro"
  | "gato"
  | "conejo"
  | "ave"
  | "pequenos"
  | "peces"
  | "reptil"
  | "personas"
  | "otro";

// ─────────────────────────── Catálogo ───────────────────────────

export interface Category {
  id: ID;
  slug: string;
  name: string;
  description?: string;
  /** Nombre de ícono de lucide-react (ver `components/veterinaria/ui/CategoryIcon.tsx`). */
  icon: string;
  image?: string;
  order: number;
  visible: boolean;
  /**
   * Productos que requieren consulta profesional antes de la venta
   * (ej. farmacia veterinaria). Se muestran, pero la compra se canaliza
   * por WhatsApp / consulta y no por el carrito.
   */
  requiresConsultation?: boolean;
  /** Productos de consumo frecuente → se ofrecen en "Volver a comprar" y recordatorios. */
  consumable?: boolean;
}

export interface ProductVariant {
  id: ID;
  /** Ej. "3 kg", "Talle M", "Rojo". */
  label: string;
  price: number | null;
  compareAtPrice?: number | null;
  sku?: string;
  barcode?: string;
  /** null = stock no controlado todavía (disponibilidad a confirmar). */
  stock: number | null;
}

export interface Product {
  id: ID;
  slug: string;
  /** Código interno (ej. MIR-001 del catálogo original). */
  code?: string;
  name: string;
  description?: string;
  categoryId: ID;
  subcategory?: string;
  brand?: string;
  species: Species[];
  tags: string[];
  images: string[];
  /** Precio de venta. null = "Consultar precio". */
  price: number | null;
  /** Precio anterior (tachado) para mostrar descuentos. */
  compareAtPrice?: number | null;
  sku?: string;
  barcode?: string;
  /** Peso / tamaño / presentación. */
  size?: string;
  variants: ProductVariant[];
  /** null = stock no controlado todavía. */
  stock: number | null;
  minStock: number;
  visible: boolean;
  featured?: boolean;
  requiresConsultation?: boolean;
  /** Recomendaciones manuales (ids de producto). */
  relatedIds?: ID[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type StockStatus = "disponible" | "poco" | "sin_stock" | "sin_control";

export type StockMovementType = "entrada" | "salida" | "ajuste" | "venta" | "devolucion";

export interface StockMovement {
  id: ID;
  productId: ID;
  variantId?: ID;
  type: StockMovementType;
  /** Positivo suma, negativo resta. */
  quantity: number;
  /** Stock resultante luego del movimiento. */
  resultingStock: number;
  reason?: string;
  orderId?: ID;
  userName?: string;
  createdAt: ISODate;
}

// ─────────────────────────── Servicios y turnos ───────────────────────────

export type ServiceKind =
  | "veterinaria"
  | "bano"
  | "peluqueria"
  | "unas"
  | "deslanado"
  | "higiene"
  | "otro";

/** 0 = domingo … 6 = sábado (igual que Date#getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface TimeRange {
  /** "09:00" */
  from: string;
  /** "13:00" */
  to: string;
}

export interface Service {
  id: ID;
  slug: string;
  kind: ServiceKind;
  name: string;
  description?: string;
  icon: string;
  durationMin: number;
  /** null = "Consultar". */
  price: number | null;
  priceNote?: string;
  /** Días habilitados. */
  days: Weekday[];
  /** Franjas horarias dentro de cada día habilitado. */
  hours: TimeRange[];
  /** Turnos simultáneos posibles en la misma franja (ej. 2 peluqueros). */
  capacity: number;
  species: Species[];
  visible: boolean;
  order: number;
  /** Días sugeridos entre servicios (para recordatorios, ej. baño cada 30 días). */
  repeatEveryDays?: number;
}

export type AppointmentStatus = "pendiente" | "confirmado" | "completado" | "cancelado" | "ausente";

export interface Appointment {
  id: ID;
  serviceId: ID;
  comboId?: ID;
  customerId?: ID;
  petId?: ID;
  customerName: string;
  phone: string;
  petName?: string;
  /** "2026-10-02" */
  date: string;
  /** "10:00" */
  time: string;
  durationMin: number;
  price: number | null;
  status: AppointmentStatus;
  notes?: string;
  source: "web" | "admin" | "whatsapp";
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface BlockedSlot {
  id: ID;
  date: string;
  /** Sin hora = día completo bloqueado. */
  time?: string;
  /** Sin servicio = bloquea todos los servicios. */
  serviceId?: ID;
  reason?: string;
}

export interface WaitlistEntry {
  id: ID;
  name: string;
  phone: string;
  petName?: string;
  serviceId: ID;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
  status: "esperando" | "avisado" | "agendado" | "descartado";
  createdAt: ISODate;
}

// ─────────────────────────── Clientes y mascotas ───────────────────────────

export type LoyaltyTierId = "nuevo" | "frecuente" | "vip";

export interface Address {
  street: string;
  number?: string;
  floor?: string;
  city?: string;
  notes?: string;
}

export interface Customer {
  id: ID;
  /** Usuario de Supabase Auth vinculado (modo supabase). */
  userId?: string;
  name: string;
  phone: string;
  email?: string;
  address?: Address;
  points: number;
  favoriteIds: ID[];
  /** Consentimiento explícito para recibir promociones. */
  marketingOptIn: boolean;
  notes?: string;
  /** Asignación manual de nivel (si no, se calcula automáticamente). */
  tierOverride?: LoyaltyTierId;
  demo?: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type PetSex = "macho" | "hembra" | "desconocido";

export interface Vaccine {
  name: string;
  date: string;
  nextDate?: string;
  notes?: string;
}

export interface Pet {
  id: ID;
  customerId: ID;
  name: string;
  species: Species;
  breed?: string;
  sex: PetSex;
  birthDate?: string;
  /** Edad aproximada en años si no se conoce la fecha. */
  approxAgeYears?: number;
  weightKg?: number;
  photo?: string;
  notes?: string;
  /** Preparado para historia clínica futura. */
  vaccines?: Vaccine[];
  demo?: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ─────────────────────────── Pedidos ───────────────────────────

export type OrderStatus =
  | "nuevo"
  | "pago_pendiente"
  | "pagado"
  | "preparando"
  | "en_camino"
  | "listo_retirar"
  | "entregado"
  | "cancelado";

export type PaymentMethod = "efectivo" | "transferencia" | "mercadopago" | "tarjeta_local";
export type DeliveryMethod = "retiro" | "envio";

export interface OrderItem {
  productId?: ID;
  variantId?: ID;
  comboId?: ID;
  name: string;
  variantLabel?: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderTotals {
  subtotal: number;
  discount: number;
  shipping: number | null;
  total: number;
  pointsEarned: number;
  pointsRedeemed: number;
}

export interface Order {
  id: ID;
  /** Número corto legible (ej. 1042). */
  number: number;
  customerId?: ID;
  customerName: string;
  phone: string;
  email?: string;
  items: OrderItem[];
  totals: OrderTotals;
  couponCode?: string;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  shippingZoneId?: ID;
  address?: Address;
  notes?: string;
  status: OrderStatus;
  statusHistory: { status: OrderStatus; at: ISODate; by?: string }[];
  source: "web" | "admin" | "whatsapp";
  demo?: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ─────────────────────────── Promociones ───────────────────────────

export type CouponType = "porcentaje" | "fijo" | "envio_gratis" | "dos_por_uno";
export type CouponAudience = "todos" | "primera_compra" | "recurrentes" | "vip";

export interface Coupon {
  id: ID;
  /** Vacío = promoción automática (sin código). */
  code?: string;
  title: string;
  description?: string;
  type: CouponType;
  /** % o $ según el tipo. */
  value: number;
  startsAt?: string;
  endsAt?: string;
  maxUses?: number;
  usedCount: number;
  minPurchase?: number;
  productIds: ID[];
  categoryIds: ID[];
  audience: CouponAudience;
  active: boolean;
  /** Mostrar en la página pública de promociones. */
  public: boolean;
  demo?: boolean;
  createdAt: ISODate;
}

export interface ComboItem {
  productId?: ID;
  serviceId?: ID;
  quantity: number;
}

export interface Combo {
  id: ID;
  slug: string;
  name: string;
  description?: string;
  items: ComboItem[];
  price: number | null;
  image?: string;
  active: boolean;
  demo?: boolean;
  createdAt: ISODate;
}

// ─────────────────────────── Fidelización ───────────────────────────

export interface LoyaltyReward {
  id: ID;
  name: string;
  points: number;
  kind: "descuento_fijo" | "descuento_porcentaje" | "producto" | "servicio" | "beneficio";
  value?: number;
  description?: string;
  active: boolean;
}

export interface LoyaltyTier {
  id: LoyaltyTierId;
  name: string;
  /** Pedidos mínimos en los últimos `windowDays` días. */
  minOrders: number;
  /** Gasto mínimo en los últimos `windowDays` días. */
  minSpent: number;
  benefits: string[];
  /** Multiplicador de puntos (1 = normal). */
  pointsMultiplier: number;
}

export interface LoyaltySettings {
  enabled: boolean;
  /** Cada `amountPerStep` pesos gastados → `pointsPerStep` puntos. */
  amountPerStep: number;
  pointsPerStep: number;
  /** Valor en pesos de cada punto al canjear como descuento directo. */
  pointValue: number;
  windowDays: number;
  tiers: LoyaltyTier[];
  rewards: LoyaltyReward[];
}

// ─────────────────────────── Envíos ───────────────────────────

export interface ShippingZone {
  id: ID;
  name: string;
  description?: string;
  /** null = a coordinar. */
  price: number | null;
  /** Envío gratis desde este monto (sobrescribe el global). */
  freeFrom?: number | null;
  /** Radio máximo desde el local, en km. */
  maxKm?: number | null;
  active: boolean;
  order: number;
}

export interface ShippingSettings {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  freeShippingFrom: number | null;
  estimatedDelivery: string;
}

// ─────────────────────────── Contenido ───────────────────────────

export interface Review {
  id: ID;
  name: string;
  photo?: string;
  text: string;
  rating: 1 | 2 | 3 | 4 | 5;
  date: string;
  source: "manual" | "google";
  visible: boolean;
  /** Reseña de ejemplo: se muestra con etiqueta visible. */
  demo?: boolean;
}

export interface Faq {
  id: ID;
  question: string;
  answer: string;
  order: number;
  visible: boolean;
}

// ─────────────────────────── Automatizaciones ───────────────────────────

export type AutomationKind =
  | "cumpleanos"
  | "bano"
  | "desparasitacion"
  | "recompra"
  | "turno_proximo"
  | "carrito_abandonado"
  | "stock_bajo"
  | "seguimiento_pedido"
  | "lista_espera";

export type AutomationChannel = "whatsapp_manual" | "whatsapp_api" | "email" | "push" | "interno";

export interface AutomationRule {
  id: AutomationKind;
  name: string;
  description: string;
  enabled: boolean;
  channel: AutomationChannel;
  /** Plantilla con variables {cliente}, {mascota}, {producto}, {fecha}, {hora}, {negocio}, {link}. */
  template: string;
  /** Parámetro principal (días de anticipación, días desde la última compra, etc.). */
  days?: number;
  /** Beneficio asociado (ej. cupón de cumpleaños). */
  couponCode?: string;
}

export interface AbandonedCart {
  id: ID;
  customerId?: ID;
  name?: string;
  phone?: string;
  items: OrderItem[];
  subtotal: number;
  updatedAt: ISODate;
  recovered: boolean;
  remindedAt?: ISODate;
}

export type NotificationKind =
  | "pedido_confirmado"
  | "pedido_listo"
  | "pedido_en_camino"
  | "turno_confirmado"
  | "turno_proximo"
  | "promociones"
  | "recordatorios";

// ─────────────────────────── Recomendaciones ───────────────────────────

export interface RecommendationRule {
  id: ID;
  name: string;
  /** Cuando el producto visto/comprado pertenece a estas categorías… */
  whenCategoryIds: ID[];
  /** …o contiene alguno de estos tags / palabras. */
  whenTags: string[];
  /** …recomendar estas categorías. */
  recommendCategoryIds: ID[];
  /** …o estos productos puntuales. */
  recommendProductIds: ID[];
  label: string;
  active: boolean;
}

// ─────────────────────────── Analíticas ───────────────────────────

export type AnalyticsEventName =
  | "product_view"
  | "add_to_cart"
  | "remove_from_cart"
  | "cart_abandoned"
  | "cart_recovered"
  | "begin_checkout"
  | "purchase"
  | "search"
  | "category_view"
  | "favorite_add"
  | "appointment_booked"
  | "waitlist_join"
  | "whatsapp_click"
  | "coupon_applied"
  | "assistant_message"
  | "pwa_install";

export interface AnalyticsEvent {
  id: ID;
  name: AnalyticsEventName;
  props?: Record<string, string | number | boolean | null | undefined>;
  sessionId: string;
  customerId?: ID;
  path?: string;
  at: ISODate;
}

// ─────────────────────────── Configuración ───────────────────────────

export type StaffRole = "ADMIN" | "EMPLEADO" | "CLIENTE";

export interface OpeningHours {
  day: Weekday;
  ranges: TimeRange[];
}

export interface BusinessSettings {
  name: string;
  legalName?: string;
  tagline: string;
  description: string;
  logo: string;
  logoAlt: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  website: string | null;
  address: {
    street: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    country: string;
  };
  /** Coordenadas del local. */
  geo: { lat: number; lng: number } | null;
  googleMapsUrl: string | null;
  hours: OpeningHours[];
  /** false mientras los horarios sean de ejemplo. */
  hoursConfirmed: boolean;
  areaServed: string[];
  colors: {
    primary: string;
    primaryDark: string;
    accent: string;
    warm: string;
    surface: string;
    ink: string;
  };
  paymentMethods: PaymentMethod[];
  bankTransferInfo: string | null;
  currency: "ARS";
}

export interface NotificationSettings {
  enabled: boolean;
  kinds: Record<NotificationKind, boolean>;
}

export interface AssistantSettings {
  enabled: boolean;
  greeting: string;
}

/** Documento único de configuración editable desde administración. */
export interface VetSettings {
  business: BusinessSettings;
  shipping: ShippingSettings;
  loyalty: LoyaltySettings;
  automations: AutomationRule[];
  notifications: NotificationSettings;
  assistant: AssistantSettings;
  lowStockDefault: number;
  abandonedCartMinutes: number;
}
