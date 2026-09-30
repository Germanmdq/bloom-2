"use client";
/** Resumen del carrito calculado con las mismas reglas que usa el servidor. */
import { useMemo } from "react";
import { computeCart } from "@/lib/vet/domain/pricing";
import { getCustomerTier } from "@/lib/vet/domain/loyalty";
import { useCart } from "@/lib/vet/client/cart";
import { useCollection, useSettings } from "@/lib/vet/client/store";
import { useCurrentCustomer } from "@/lib/vet/client/session";

export function useCartSummary(opts: { deliveryMethod?: "retiro" | "envio"; zoneId?: string; pointsToRedeem?: number } = {}) {
  const lines = useCart((s) => s.lines);
  const couponCode = useCart((s) => s.couponCode);
  const settings = useSettings();
  const products = useCollection("products");
  const combos = useCollection("combos");
  const coupons = useCollection("coupons");
  const zones = useCollection("shippingZones");
  const orders = useCollection("orders");
  const { customer } = useCurrentCustomer();
  const ready = products.ready && combos.ready && coupons.ready && zones.ready;

  const result = useMemo(() => {
    if (!ready) return null;
    const previous = customer ? orders.items.filter((o) => o.customerId === customer.id && o.status !== "cancelado").length : 0;
    const tier = customer ? getCustomerTier(customer, orders.items, settings.loyalty) : undefined;
    return computeCart({
      lines,
      products: products.items,
      combos: combos.items,
      coupons: coupons.items,
      couponCode,
      deliveryMethod: opts.deliveryMethod ?? "retiro",
      zone: zones.items.find((z) => z.id === opts.zoneId) ?? null,
      shipping: settings.shipping,
      loyalty: settings.loyalty,
      customerPoints: customer?.points ?? 0,
      pointsToRedeem: opts.pointsToRedeem,
      previousOrders: previous,
      tier: tier?.id,
      pointsMultiplier: tier?.pointsMultiplier,
    });
  }, [ready, lines, couponCode, products.items, combos.items, coupons.items, zones.items, orders.items, customer, settings, opts.deliveryMethod, opts.zoneId, opts.pointsToRedeem]);

  return { result, ready, lines, couponCode, zones: zones.items.filter((z) => z.active).sort((a, b) => a.order - b.order), products: products.items, customer, settings };
}
