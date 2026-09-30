"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banknote, Building2, ChevronLeft, CreditCard, LocateFixed, Lock, Store, Truck, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { Order, PaymentMethod } from "@/lib/vet/types";
import { vetPath, INTEGRATIONS } from "@/lib/vet/config/integrations";
import { formatMoney } from "@/lib/vet/domain/format";
import { PAYMENT_LABEL } from "@/lib/vet/domain/labels";
import { distanceKm, zoneForDistance } from "@/lib/vet/domain/pricing";
import { rewardProgress } from "@/lib/vet/domain/loyalty";
import { placeOrder } from "@/lib/vet/client/actions";
import { useCart } from "@/lib/vet/client/cart";
import { useHydrated } from "@/lib/vet/client/session";
import { useCartSummary } from "./useCartSummary";
import { Button, Card, EmptyState, Input, Skeleton, Textarea, Toggle, ButtonLink } from "../ui/primitives";
import { cn } from "@/lib/utils";

const PAY_ICON: Record<PaymentMethod, typeof Wallet> = { efectivo: Banknote, transferencia: Building2, mercadopago: Wallet, tarjeta_local: CreditCard };

export function CheckoutView() {
  const router = useRouter();
  const hydrated = useHydrated();
  const clear = useCart((s) => s.clear);
  const [delivery, setDelivery] = useState<Order["deliveryMethod"]>("retiro");
  const [zoneId, setZoneId] = useState<string>("");
  const [usePoints, setUsePoints] = useState(false);
  const { result, ready, lines, couponCode, zones, customer, settings } = useCartSummary({ deliveryMethod: delivery, zoneId, pointsToRedeem: usePoints ? Number.MAX_SAFE_INTEGER : 0 });
  const [form, setForm] = useState({ name: "", phone: "", email: "", street: "", number: "", floor: "", addressNotes: "", notes: "", optIn: true });
  const [payment, setPayment] = useState<PaymentMethod>("efectivo");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [serverQuote, setServerQuote] = useState<{ total: number; couponError?: string } | null>(null);

  useEffect(() => {
    if (customer) {
      setForm((f) => ({
        ...f,
        name: f.name || customer.name,
        phone: f.phone || customer.phone,
        email: f.email || customer.email || "",
        street: f.street || customer.address?.street || "",
        number: f.number || customer.address?.number || "",
        floor: f.floor || customer.address?.floor || "",
        optIn: customer.marketingOptIn,
      }));
    }
  }, [customer?.id]);

  useEffect(() => {
    if (!zoneId && zones.length) setZoneId(zones[0].id);
  }, [zones.length]);

  // Modo supabase: cupones privados y total definitivo se validan en el servidor.
  useEffect(() => {
    if (INTEGRATIONS.dataSource !== "supabase" || !lines.length) return;
    const t = setTimeout(async () => {
      const res = await fetch("/api/veterinaria/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dryRun: true, lines, couponCode, deliveryMethod: delivery, zoneId, customer: { phone: form.phone } }) }).catch(() => null);
      const json = await res?.json().catch(() => null);
      if (json?.quote) setServerQuote({ total: json.quote.totals.total, couponError: json.quote.couponError });
    }, 500);
    return () => clearTimeout(t);
  }, [lines, couponCode, delivery, zoneId, form.phone]);

  if (!hydrated || !ready) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 px-4 pt-6 sm:px-6">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (!lines.length) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <EmptyState icon={<Store className="size-6" />} title="No hay productos para comprar" action={<ButtonLink href={vetPath("/tienda")}>Ir a la tienda</ButtonLink>} />
      </div>
    );
  }

  const r = result!;
  const geo = settings.business.geo;
  const canDetect = geo && zones.some((z) => z.maxKm != null);
  const progress = customer ? rewardProgress(customer.points, settings.loyalty.rewards) : null;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = "Ingresá tu nombre";
    if (form.phone.replace(/\D/g, "").length < 8) errs.phone = "Ingresá un teléfono válido (con código de área)";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Revisá el email";
    if (delivery === "envio" && !form.street.trim()) errs.street = "Ingresá la calle";
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`f-${Object.keys(errs)[0]}`)?.focus();
      toast.error("Revisá los datos marcados");
      return;
    }
    setSending(true);
    try {
      const order = await placeOrder({
        lines,
        couponCode: couponCode || undefined,
        pointsToRedeem: usePoints ? customer?.points ?? 0 : 0,
        customer: { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || undefined, marketingOptIn: form.optIn },
        deliveryMethod: delivery,
        zoneId: delivery === "envio" ? zoneId : undefined,
        address: delivery === "envio" ? { street: form.street.trim(), number: form.number.trim() || undefined, floor: form.floor.trim() || undefined, notes: form.addressNotes.trim() || undefined } : undefined,
        paymentMethod: payment,
        notes: form.notes,
      });
      clear();
      router.push(vetPath(`/pedido/${order.id}?nuevo=1`));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos crear el pedido");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-5xl px-4 pt-5 sm:px-6">
      <Link href={vetPath("/carrito")} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-neutral-600 hover:text-vet-ink">
        <ChevronLeft className="size-4" /> Volver al carrito
      </Link>
      <h1 className="mb-5 font-vet-display text-3xl font-extrabold tracking-[-0.01em]">Finalizar compra</h1>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold"><span className="grid size-7 place-items-center rounded-full bg-vet-primary text-xs text-white">1</span> Tus datos</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input id="f-name" label="Nombre y apellido" autoComplete="name" required value={form.name} onChange={set("name")} error={errors.name} />
              <Input id="f-phone" label="Teléfono / WhatsApp" type="tel" inputMode="tel" autoComplete="tel" required value={form.phone} onChange={set("phone")} error={errors.phone} hint="Te avisamos el estado del pedido por acá" />
              <Input id="f-email" label="Email (opcional)" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} className="sm:col-span-2" />
            </div>
            <div className="mt-3">
              <Toggle checked={form.optIn} onChange={(v) => setForm({ ...form, optIn: v })} label="Quiero recibir promociones y recordatorios" description="Solo por WhatsApp o email, sin spam. Podés darte de baja cuando quieras." />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold"><span className="grid size-7 place-items-center rounded-full bg-vet-primary text-xs text-white">2</span> Entrega</h2>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Método de entrega">
              {settings.shipping.pickupEnabled && (
                <button type="button" role="radio" aria-checked={delivery === "retiro"} onClick={() => setDelivery("retiro")} className={cn("flex min-h-20 flex-col items-start justify-center rounded-2xl p-3 text-left ring-1 transition", delivery === "retiro" ? "bg-vet-tint ring-2 ring-vet-primary" : "bg-white ring-black/10")}>
                  <Store className="size-5 text-vet-primary" />
                  <span className="mt-1 text-sm font-bold">Retiro en el local</span>
                  <span className="text-xs text-neutral-500">Sin costo</span>
                </button>
              )}
              {settings.shipping.deliveryEnabled && (
                <button type="button" role="radio" aria-checked={delivery === "envio"} onClick={() => setDelivery("envio")} className={cn("flex min-h-20 flex-col items-start justify-center rounded-2xl p-3 text-left ring-1 transition", delivery === "envio" ? "bg-vet-tint ring-2 ring-vet-primary" : "bg-white ring-black/10")}>
                  <Truck className="size-5 text-vet-primary" />
                  <span className="mt-1 text-sm font-bold">Envío a domicilio</span>
                  <span className="text-xs text-neutral-500">Según zona</span>
                </button>
              )}
            </div>

            {delivery === "envio" && (
              <div className="mt-4 space-y-3">
                <fieldset>
                  <legend className="mb-2 text-[13px] font-semibold text-vet-ink/80">Zona de envío</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {zones.map((z) => (
                      <label key={z.id} className={cn("flex cursor-pointer flex-col rounded-2xl p-3 ring-1 transition", zoneId === z.id ? "bg-vet-tint ring-2 ring-vet-primary" : "bg-white ring-black/10")}>
                        <input type="radio" name="zone" value={z.id} checked={zoneId === z.id} onChange={() => setZoneId(z.id)} className="sr-only" />
                        <span className="text-sm font-bold">{z.name}</span>
                        {z.description && <span className="text-xs text-neutral-500">{z.description}</span>}
                        <span className="mt-1 text-sm font-semibold tabular-nums">{z.price != null ? formatMoney(z.price) : "A coordinar"}</span>
                      </label>
                    ))}
                  </div>
                  {canDetect && (
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-vet-primary-dark"
                      onClick={() =>
                        navigator.geolocation?.getCurrentPosition(
                          (pos) => {
                            const km = distanceKm(geo!, { lat: pos.coords.latitude, lng: pos.coords.longitude });
                            const z = zoneForDistance(zones, km);
                            if (z) {
                              setZoneId(z.id);
                              toast.success(`Estás a ${km.toFixed(1)} km: ${z.name}`);
                            } else toast.info(`Estás a ${km.toFixed(1)} km. Consultanos si llegamos a tu zona.`);
                          },
                          () => toast.error("No pudimos obtener tu ubicación"),
                        )
                      }
                    >
                      <LocateFixed className="size-4" /> Detectar mi zona
                    </button>
                  )}
                </fieldset>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px_120px]">
                  <Input id="f-street" label="Calle" autoComplete="address-line1" required value={form.street} onChange={set("street")} error={errors.street} />
                  <Input label="Número" inputMode="numeric" value={form.number} onChange={set("number")} />
                  <Input label="Piso / depto" value={form.floor} onChange={set("floor")} />
                </div>
                <Input label="Referencias (opcional)" value={form.addressNotes} onChange={set("addressNotes")} placeholder="Entre calles, timbre, horario…" />
                <p className="text-xs text-neutral-500">{settings.shipping.estimatedDelivery}</p>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold"><span className="grid size-7 place-items-center rounded-full bg-vet-primary text-xs text-white">3</span> Pago</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Medio de pago">
              {settings.business.paymentMethods.map((m) => {
                const Icon = PAY_ICON[m];
                return (
                  <button key={m} type="button" role="radio" aria-checked={payment === m} onClick={() => setPayment(m)} className={cn("flex min-h-14 items-center gap-3 rounded-2xl px-4 text-left text-sm font-semibold ring-1 transition", payment === m ? "bg-vet-tint ring-2 ring-vet-primary" : "bg-white ring-black/10")}>
                    <Icon className="size-5 text-vet-primary" /> {PAYMENT_LABEL[m]}
                  </button>
                );
              })}
            </div>
            {payment === "transferencia" && <p className="mt-3 rounded-2xl bg-vet-sand p-3 text-xs leading-relaxed">{settings.business.bankTransferInfo ?? "Te enviamos los datos para la transferencia por WhatsApp al confirmar el pedido."}</p>}
            {payment === "mercadopago" && <p className="mt-3 rounded-2xl bg-vet-sand p-3 text-xs leading-relaxed">{INTEGRATIONS.mercadoPagoEnabled ? "Vas a poder pagar con Mercado Pago al confirmar." : "Te enviamos el link de pago de Mercado Pago por WhatsApp al confirmar el pedido."}</p>}

            {settings.loyalty.enabled && customer && customer.points > 0 && (
              <div className="mt-4 rounded-2xl bg-vet-tint/60 p-3">
                <Toggle checked={usePoints} onChange={setUsePoints} label={`Usar mis puntos (${customer.points})`} description={`Equivalen a ${formatMoney(Math.floor(customer.points * settings.loyalty.pointValue))} de descuento.`} />
                {progress?.next && !usePoints && <p className="mt-1 text-xs text-vet-primary-dark">Te faltan {progress.missing} puntos para «{progress.next.name}».</p>}
              </div>
            )}
            <Textarea label="Comentarios (opcional)" value={form.notes} onChange={set("notes")} className="mt-4" placeholder="Algo que tengamos que saber" maxLength={500} />
          </Card>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <h2 className="text-base font-bold">Resumen</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {r.lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="min-w-0 text-neutral-700"><span className="line-clamp-1">{l.name}{l.variantLabel ? ` · ${l.variantLabel}` : ""}</span><span className="text-xs text-neutral-500">x{l.quantity}</span></span>
                  <span className="shrink-0 tabular-nums">{formatMoney(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-black/5 pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-neutral-600">Subtotal</dt><dd className="tabular-nums">{formatMoney(r.totals.subtotal)}</dd></div>
              {r.totals.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Descuentos</dt><dd className="tabular-nums">−{formatMoney(r.totals.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-neutral-600">Envío</dt><dd className="tabular-nums">{delivery === "retiro" ? "Sin costo" : r.freeShipping ? "¡Gratis!" : r.totals.shipping == null ? "A coordinar" : formatMoney(r.totals.shipping)}</dd></div>
              <div className="flex justify-between pt-1 text-lg font-extrabold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(serverQuote?.total ?? r.totals.total)}</dd></div>
            </dl>
            {(serverQuote?.couponError ?? (couponCode ? r.couponError : undefined)) && <p className="mt-2 text-xs font-medium text-red-600">{serverQuote?.couponError ?? r.couponError}</p>}
            {r.missingForFreeShipping != null && delivery === "envio" && <p className="mt-2 text-xs text-vet-primary-dark">Sumá {formatMoney(r.missingForFreeShipping)} y el envío es gratis.</p>}
            <Button type="submit" size="lg" className="mt-4 w-full" loading={sending} disabled={r.hasProblems}>
              <Lock className="size-4" /> Confirmar pedido
            </Button>
            <p className="mt-2 text-center text-[11px] leading-relaxed text-neutral-500">Al confirmar te contactamos por WhatsApp para coordinar {delivery === "envio" ? "la entrega" : "el retiro"} y el pago. No se cobra nada automáticamente.</p>
          </Card>
        </div>
      </div>
    </form>
  );
}
