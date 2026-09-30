import type { Product, StockMovement, StockMovementType, StockStatus } from "../types";

/** Stock total del producto (suma de variantes si las tiene). null = no controlado. */
export function totalStock(p: Product): number | null {
  if (p.variants.length) {
    const tracked = p.variants.filter((v) => v.stock != null);
    if (!tracked.length) return null;
    return tracked.reduce((s, v) => s + (v.stock ?? 0), 0);
  }
  return p.stock;
}

export function stockStatusOf(stock: number | null, minStock: number): StockStatus {
  if (stock == null) return "sin_control";
  if (stock <= 0) return "sin_stock";
  if (stock <= minStock) return "poco";
  return "disponible";
}

export function getStockStatus(p: Product): StockStatus {
  return stockStatusOf(totalStock(p), p.minStock);
}

export const STOCK_STATUS_META: Record<StockStatus, { label: string; emoji: string; tone: "green" | "amber" | "red" | "gray" }> = {
  disponible: { label: "Disponible", emoji: "🟢", tone: "green" },
  poco: { label: "Poco stock", emoji: "🟡", tone: "amber" },
  sin_stock: { label: "Sin stock", emoji: "🔴", tone: "red" },
  sin_control: { label: "Stock sin cargar", emoji: "⚪", tone: "gray" },
};

/** ¿Se puede agregar al carrito? (sin stock controlado se permite: disponibilidad a confirmar). */
export function canPurchase(p: Product, variantId?: string): boolean {
  if (!p.visible || p.requiresConsultation) return false;
  if (p.variants.length) {
    const v = p.variants.find((x) => x.id === variantId);
    if (!v || v.price == null) return false;
    return v.stock == null || v.stock > 0;
  }
  if (p.price == null) return false;
  return p.stock == null || p.stock > 0;
}

export interface StockChange {
  product: Product;
  movement: StockMovement;
}

/**
 * Aplica un movimiento de stock y devuelve el producto actualizado + el
 * movimiento para el historial. Para `ajuste`, `quantity` es el stock final.
 */
export function applyStockMovement(
  product: Product,
  input: { type: StockMovementType; quantity: number; variantId?: string; reason?: string; orderId?: string; userName?: string },
  id: string,
  now = new Date(),
): StockChange {
  const variant = input.variantId ? product.variants.find((v) => v.id === input.variantId) : undefined;
  const current = (variant ? variant.stock : product.stock) ?? 0;
  const next = input.type === "ajuste" ? Math.max(0, Math.round(input.quantity)) : Math.max(0, current + Math.round(input.quantity));
  const delta = next - current;
  const updated: Product = variant
    ? { ...product, variants: product.variants.map((v) => (v.id === variant.id ? { ...v, stock: next } : v)), updatedAt: now.toISOString() }
    : { ...product, stock: next, updatedAt: now.toISOString() };
  return {
    product: updated,
    movement: {
      id,
      productId: product.id,
      variantId: variant?.id,
      type: input.type,
      quantity: delta,
      resultingStock: next,
      reason: input.reason,
      orderId: input.orderId,
      userName: input.userName,
      createdAt: now.toISOString(),
    },
  };
}
