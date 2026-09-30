/**
 * Cálculo del carrito: precios, cupones, promociones automáticas, envío y
 * puntos. Es una función pura: se usa igual en el navegador (vista previa)
 * y en el servidor (`/api/veterinaria/orders`), donde se recalcula todo con
 * los precios de la base de datos para que nadie pueda alterar el total.
 */
import type {
  Combo,
  Coupon,
  CouponAudience,
  LoyaltySettings,
  LoyaltyTierId,
  OrderItem,
  OrderTotals,
  Product,
  ShippingSettings,
  ShippingZone,
} from "../types";
import { canPurchase } from "./stock";
import { computeLoyaltyPointsForAmount, pointsToMoney } from "./loyalty";

export interface CartLine {
  productId?: string;
  variantId?: string;
  comboId?: string;
  quantity: number;
}

export interface ResolvedLine extends OrderItem {
  categoryId?: string;
  lineTotal: number;
  available: boolean;
  problem?: string;
}

export function unitPriceOf(p: Product, variantId?: string): number | null {
  if (p.variants.length) return p.variants.find((v) => v.id === variantId)?.price ?? null;
  return p.price;
}

/** Precio "desde" para mostrar en tarjetas. */
export function displayPrice(p: Product): { price: number | null; from: boolean; compareAt: number | null } {
  if (p.variants.length) {
    const prices = p.variants.map((v) => v.price).filter((x): x is number => x != null);
    if (!prices.length) return { price: null, from: false, compareAt: null };
    const min = Math.min(...prices);
    return { price: min, from: new Set(prices).size > 1, compareAt: null };
  }
  return { price: p.price, from: false, compareAt: p.compareAtPrice && p.price && p.compareAtPrice > p.price ? p.compareAtPrice : null };
}

export function comboRegularPrice(combo: Combo, products: Product[], services: { id: string; price: number | null }[]): number | null {
  let sum = 0;
  for (const it of combo.items) {
    const price = it.productId
      ? (() => {
          const p = products.find((x) => x.id === it.productId);
          return p ? (p.price ?? p.variants.find((v) => v.price != null)?.price ?? null) : null;
        })()
      : services.find((s) => s.id === it.serviceId)?.price ?? null;
    if (price == null) return null;
    sum += price * it.quantity;
  }
  return sum;
}

export function resolveLines(lines: CartLine[], products: Product[], combos: Combo[]): ResolvedLine[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return lines
    .filter((l) => l.quantity > 0)
    .map((l): ResolvedLine => {
      if (l.comboId) {
        const combo = combos.find((c) => c.id === l.comboId);
        const hasServices = combo?.items.some((i) => i.serviceId);
        const ok = Boolean(combo?.active && combo.price != null && !hasServices);
        return {
          comboId: l.comboId,
          name: combo?.name ?? "Combo no disponible",
          unitPrice: combo?.price ?? 0,
          quantity: l.quantity,
          lineTotal: ok ? (combo!.price ?? 0) * l.quantity : 0,
          available: ok,
          problem: ok ? undefined : "Este combo ya no está disponible",
        };
      }
      const p = l.productId ? byId.get(l.productId) : undefined;
      if (!p) return { productId: l.productId, name: "Producto no disponible", unitPrice: 0, quantity: l.quantity, lineTotal: 0, available: false, problem: "Este producto ya no está disponible" };
      const variant = p.variants.find((v) => v.id === l.variantId);
      const price = unitPriceOf(p, l.variantId);
      const ok = canPurchase(p, l.variantId);
      const stock = variant ? variant.stock : p.stock;
      const overStock = stock != null && l.quantity > stock;
      return {
        productId: p.id,
        variantId: variant?.id,
        categoryId: p.categoryId,
        name: p.name,
        variantLabel: variant?.label,
        unitPrice: price ?? 0,
        quantity: l.quantity,
        lineTotal: ok && price != null ? price * l.quantity : 0,
        available: ok && !overStock,
        problem: !ok ? (price == null ? "Precio a consultar" : "Sin stock") : overStock ? `Solo quedan ${stock} unidades` : undefined,
      };
    });
}

export interface CouponContext {
  subtotal: number;
  lines: ResolvedLine[];
  /** Pedidos previos no cancelados del cliente (0 = primera compra). */
  previousOrders: number;
  tier?: LoyaltyTierId;
  now?: Date;
}

export interface CouponCheck {
  ok: boolean;
  reason?: string;
}

function audienceOk(a: CouponAudience, ctx: CouponContext): boolean {
  switch (a) {
    case "primera_compra":
      return ctx.previousOrders === 0;
    case "recurrentes":
      return ctx.previousOrders > 0;
    case "vip":
      return ctx.tier === "vip";
    default:
      return true;
  }
}

function eligibleSubtotal(c: Coupon, lines: ResolvedLine[]): number {
  const scoped = c.productIds.length > 0 || c.categoryIds.length > 0;
  return lines
    .filter((l) => l.available)
    .filter((l) => !scoped || (l.productId && c.productIds.includes(l.productId)) || (l.categoryId && c.categoryIds.includes(l.categoryId)))
    .reduce((s, l) => s + l.lineTotal, 0);
}

export function checkCoupon(c: Coupon, ctx: CouponContext): CouponCheck {
  const now = ctx.now ?? new Date();
  const today = now.toISOString().slice(0, 10);
  if (!c.active) return { ok: false, reason: "Este cupón no está activo" };
  if (c.startsAt && today < c.startsAt.slice(0, 10)) return { ok: false, reason: "Este cupón todavía no está vigente" };
  if (c.endsAt && today > c.endsAt.slice(0, 10)) return { ok: false, reason: "Este cupón está vencido" };
  if (c.maxUses != null && c.usedCount >= c.maxUses) return { ok: false, reason: "Este cupón alcanzó su límite de usos" };
  if (c.minPurchase && ctx.subtotal < c.minPurchase) return { ok: false, reason: `Compra mínima de $${c.minPurchase.toLocaleString("es-AR")}` };
  if (!audienceOk(c.audience, ctx)) {
    return { ok: false, reason: c.audience === "primera_compra" ? "Válido solo para la primera compra" : "Este cupón no aplica a tu cuenta" };
  }
  if (c.type !== "envio_gratis" && eligibleSubtotal(c, ctx.lines) <= 0) return { ok: false, reason: "No hay productos válidos para este cupón en tu carrito" };
  return { ok: true };
}

export function couponDiscount(c: Coupon, lines: ResolvedLine[]): number {
  const base = eligibleSubtotal(c, lines);
  switch (c.type) {
    case "porcentaje":
      return Math.round((base * Math.min(100, Math.max(0, c.value))) / 100);
    case "fijo":
      return Math.min(base, Math.max(0, c.value));
    case "dos_por_uno": {
      const scoped = c.productIds.length > 0 || c.categoryIds.length > 0;
      return lines
        .filter((l) => l.available && (!scoped || (l.productId && c.productIds.includes(l.productId)) || (l.categoryId && c.categoryIds.includes(l.categoryId))))
        .reduce((s, l) => s + Math.floor(l.quantity / 2) * l.unitPrice, 0);
    }
    default:
      return 0;
  }
}

export interface CartInput {
  lines: CartLine[];
  products: Product[];
  combos: Combo[];
  coupons: Coupon[];
  couponCode?: string;
  deliveryMethod: "retiro" | "envio";
  zone?: ShippingZone | null;
  shipping: ShippingSettings;
  loyalty: LoyaltySettings;
  customerPoints?: number;
  pointsToRedeem?: number;
  previousOrders?: number;
  tier?: LoyaltyTierId;
  pointsMultiplier?: number;
  now?: Date;
}

export interface CartResult {
  lines: ResolvedLine[];
  totals: OrderTotals;
  appliedCoupon?: Coupon;
  couponError?: string;
  automaticPromo?: Coupon;
  automaticDiscount: number;
  couponDiscountAmount: number;
  pointsDiscount: number;
  freeShipping: boolean;
  /** Cuánto falta para envío gratis (si aplica). */
  missingForFreeShipping: number | null;
  hasProblems: boolean;
}

export function computeCart(input: CartInput): CartResult {
  const lines = resolveLines(input.lines, input.products, input.combos);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const ctx: CouponContext = { subtotal, lines, previousOrders: input.previousOrders ?? 0, tier: input.tier, now: input.now };

  // Mejor promoción automática (sin código).
  let automaticPromo: Coupon | undefined;
  let automaticDiscount = 0;
  for (const c of input.coupons.filter((x) => !x.code)) {
    if (!checkCoupon(c, ctx).ok) continue;
    const d = couponDiscount(c, lines);
    if (d > automaticDiscount) {
      automaticDiscount = d;
      automaticPromo = c;
    }
  }

  // Cupón ingresado por el cliente.
  let appliedCoupon: Coupon | undefined;
  let couponError: string | undefined;
  let couponDiscountAmount = 0;
  const code = input.couponCode?.trim().toUpperCase();
  if (code) {
    const c = input.coupons.find((x) => x.code?.toUpperCase() === code);
    if (!c) couponError = "No encontramos ese cupón";
    else {
      const check = checkCoupon(c, ctx);
      if (!check.ok) couponError = check.reason;
      else {
        appliedCoupon = c;
        couponDiscountAmount = couponDiscount(c, lines);
      }
    }
  }

  const discountBeforePoints = Math.min(subtotal, automaticDiscount + couponDiscountAmount);
  const afterDiscount = subtotal - discountBeforePoints;

  // Canje de puntos.
  const maxPoints = Math.min(input.pointsToRedeem ?? 0, input.customerPoints ?? 0);
  const pointsDiscount = input.loyalty.enabled ? Math.min(afterDiscount, pointsToMoney(Math.max(0, maxPoints), input.loyalty)) : 0;
  const pointsRedeemed = input.loyalty.pointValue > 0 ? Math.ceil(pointsDiscount / input.loyalty.pointValue) : 0;
  const net = afterDiscount - pointsDiscount;

  // Envío.
  let shipping: number | null = 0;
  let freeShipping = false;
  let missingForFreeShipping: number | null = null;
  if (input.deliveryMethod === "envio") {
    const threshold = input.zone?.freeFrom ?? input.shipping.freeShippingFrom;
    if (appliedCoupon?.type === "envio_gratis") freeShipping = true;
    else if (threshold != null && net >= threshold) freeShipping = true;
    else if (threshold != null) missingForFreeShipping = threshold - net;
    shipping = freeShipping ? 0 : input.zone?.price ?? null;
  }

  const total = net + (shipping ?? 0);
  return {
    lines,
    totals: {
      subtotal,
      discount: discountBeforePoints + pointsDiscount,
      shipping,
      total,
      pointsEarned: computeLoyaltyPointsForAmount(net, input.loyalty, input.pointsMultiplier ?? 1),
      pointsRedeemed,
    },
    appliedCoupon,
    couponError,
    automaticPromo,
    automaticDiscount,
    couponDiscountAmount,
    pointsDiscount,
    freeShipping,
    missingForFreeShipping,
    hasProblems: lines.some((l) => !l.available),
  };
}

/** Distancia en km entre dos coordenadas (fórmula de Haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Zona que corresponde a una distancia (la de menor radio que la cubre). */
export function zoneForDistance(zones: ShippingZone[], km: number): ShippingZone | null {
  return (
    [...zones]
      .filter((z) => z.active && z.maxKm != null)
      .sort((a, b) => (a.maxKm ?? 0) - (b.maxKm ?? 0))
      .find((z) => km <= (z.maxKm ?? 0)) ?? null
  );
}
