"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, MessageCircle, ShoppingBag, TicketPercent, Trash2, Truck } from "lucide-react";
import { vetPath } from "@/lib/vet/config/integrations";
import { formatMoney } from "@/lib/vet/domain/format";
import { waLink, WA_MESSAGES } from "@/lib/vet/domain/whatsapp";
import { recommendForCart } from "@/lib/vet/domain/recommendations";
import { lineKey, useCart } from "@/lib/vet/client/cart";
import { useCollection } from "@/lib/vet/client/store";
import { useHydrated } from "@/lib/vet/client/session";
import { recordOpenCart } from "@/lib/vet/client/actions";
import { track } from "@/lib/vet/client/analytics";
import { useCartSummary } from "./useCartSummary";
import { ProductImage } from "./ProductVisuals";
import { ProductRail } from "./ProductCard";
import { Badge, ButtonLink, Card, EmptyState, QuantityStepper, SectionTitle, Skeleton } from "../ui/primitives";

export function CartView() {
  const hydrated = useHydrated();
  const { result, ready, lines, couponCode, products, settings } = useCartSummary();
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const setCoupon = useCart((s) => s.setCoupon);
  const categories = useCollection("categories");
  const rules = useCollection("recommendationRules");
  const orders = useCollection("orders");
  const [code, setCode] = useState(couponCode);

  // Registra el carrito abierto (recuperación de carritos).
  useEffect(() => {
    if (!result || !lines.length) return;
    const t = setTimeout(() => recordOpenCart(lines, result.totals.subtotal, result.lines.map((l) => ({ name: l.name, unitPrice: l.unitPrice, quantity: l.quantity, productId: l.productId }))), 1500);
    return () => clearTimeout(t);
  }, [lines, result?.totals.subtotal]);

  if (!hydrated || !ready) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 px-4 pt-6 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <h1 className="mb-5 font-vet-display text-3xl font-extrabold tracking-[-0.01em]">Carrito</h1>
        <EmptyState icon={<ShoppingBag className="size-6" />} title="Tu carrito está vacío" text="Explorá la tienda y agregá lo que tu mascota necesita." action={<ButtonLink href={vetPath("/tienda")}>Ir a la tienda</ButtonLink>} />
      </div>
    );
  }

  const r = result!;
  const recs = recommendForCart(lines.map((l) => l.productId).filter(Boolean) as string[], products, rules.items, orders.items, 10);
  const waText = WA_MESSAGES.cart(r.lines.filter((l) => l.available), r.totals.total, r.appliedCoupon?.code ? `Cupón: ${r.appliedCoupon.code}` : undefined);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
      <h1 className="mb-5 font-vet-display text-3xl font-extrabold tracking-[-0.01em]">Carrito</h1>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {r.lines.map((l, i) => {
            const src = lines[i];
            const key = lineKey(src);
            const p = l.productId ? products.find((x) => x.id === l.productId) : undefined;
            return (
              <Card key={key} className="flex gap-3 p-3">
                {p ? (
                  <Link href={vetPath(`/producto/${p.slug}`)} className="shrink-0">
                    <ProductImage product={p} className="size-20 rounded-2xl sm:size-24" />
                  </Link>
                ) : (
                  <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-vet-tint text-xs font-bold text-vet-primary sm:size-24">Combo</div>
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug">{l.name}</p>
                      {l.variantLabel && <p className="text-xs text-neutral-500">{l.variantLabel}</p>}
                      {l.problem && <Badge tone={l.available ? "amber" : "red"} className="mt-1">{l.problem}</Badge>}
                    </div>
                    <button type="button" onClick={() => remove(key)} className="grid size-9 shrink-0 place-items-center rounded-full text-neutral-400 hover:bg-red-50 hover:text-red-600" aria-label={`Quitar ${l.name}`}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                    <QuantityStepper size="sm" value={src.quantity} onChange={(v) => setQuantity(key, v)} min={1} />
                    <div className="text-right">
                      <p className="font-bold tabular-nums">{formatMoney(l.lineTotal)}</p>
                      {src.quantity > 1 && <p className="text-[11px] text-neutral-500 tabular-nums">{formatMoney(l.unitPrice)} c/u</p>}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setCoupon(code.trim().toUpperCase());
                if (code.trim()) track("coupon_applied", { code: code.trim().toUpperCase(), stage: "cart" });
              }}
            >
              <label htmlFor="coupon" className="sr-only">Cupón de descuento</label>
              <div className="relative flex-1">
                <TicketPercent className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <input id="coupon" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Cupón" className="h-11 w-full rounded-2xl border border-black/10 bg-white pl-9 pr-3 text-sm uppercase outline-none focus:border-vet-primary focus:ring-4 focus:ring-vet-primary/15" />
              </div>
              <button type="submit" className="h-11 rounded-2xl bg-vet-ink px-4 text-sm font-bold text-white">Aplicar</button>
            </form>
            {couponCode && r.couponError && <p className="mt-2 text-xs font-medium text-red-600" role="alert">{r.couponError}</p>}
            {r.appliedCoupon && <p className="mt-2 text-xs font-semibold text-emerald-700">Cupón {r.appliedCoupon.code} aplicado ✓</p>}

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-neutral-600">Subtotal</dt><dd className="tabular-nums">{formatMoney(r.totals.subtotal)}</dd></div>
              {r.automaticDiscount > 0 && <div className="flex justify-between text-emerald-700"><dt>{r.automaticPromo?.title}</dt><dd className="tabular-nums">−{formatMoney(r.automaticDiscount)}</dd></div>}
              {r.couponDiscountAmount > 0 && <div className="flex justify-between text-emerald-700"><dt>Cupón {r.appliedCoupon?.code}</dt><dd className="tabular-nums">−{formatMoney(r.couponDiscountAmount)}</dd></div>}
              <div className="flex justify-between text-neutral-600"><dt>Envío</dt><dd>Se calcula al finalizar</dd></div>
              <div className="flex justify-between border-t border-black/5 pt-3 text-base font-extrabold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(r.totals.total)}</dd></div>
            </dl>
            {settings.loyalty.enabled && r.totals.pointsEarned > 0 && <p className="mt-2 text-xs text-vet-primary-dark">Sumás {r.totals.pointsEarned} puntos con esta compra 🐾</p>}
            {settings.shipping.freeShippingFrom != null && r.totals.total < settings.shipping.freeShippingFrom && (
              <p className="mt-3 flex items-center gap-2 rounded-2xl bg-vet-sand p-3 text-xs text-vet-ink">
                <Truck className="size-4 shrink-0 text-vet-warm" /> Te faltan {formatMoney(settings.shipping.freeShippingFrom - r.totals.total)} para el envío gratis.
              </p>
            )}

            <ButtonLink href={vetPath("/checkout")} size="lg" className="mt-4 w-full" onClick={() => track("begin_checkout", { total: r.totals.total, items: lines.length })}>
              Finalizar compra <ArrowRight className="size-5" />
            </ButtonLink>
            <a
              href={waLink(settings.business.whatsapp, waText)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("whatsapp_click", { context: "cart_share", total: r.totals.total })}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-[#0e7a40] ring-1 ring-[#128C4B]/30 hover:bg-green-50"
            >
              <MessageCircle className="size-5" /> Enviar pedido por WhatsApp
            </a>
          </Card>
        </div>
      </div>

      {recs.length > 0 && (
        <section className="mt-10">
          <SectionTitle title="Combiná con" subtitle="Productos que suelen llevarse juntos" />
          <ProductRail products={recs} categories={categories.items} />
        </section>
      )}
    </div>
  );
}
