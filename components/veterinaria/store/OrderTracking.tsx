"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2, MessageCircle, PackageSearch } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/vet/types";
import { INTEGRATIONS, vetPath } from "@/lib/vet/config/integrations";
import { formatDateTime, formatMoney } from "@/lib/vet/domain/format";
import { DELIVERY_LABEL, ORDER_STATUS, PAYMENT_LABEL } from "@/lib/vet/domain/labels";
import { waLink, WA_MESSAGES } from "@/lib/vet/domain/whatsapp";
import { useCollection, useSettings } from "@/lib/vet/client/store";
import { localNotify, notificationPermission, requestNotifications } from "@/lib/vet/client/notifications";
import { track } from "@/lib/vet/client/analytics";
import { Badge, Button, ButtonLink, Card, EmptyState, Skeleton } from "../ui/primitives";
import { cn } from "@/lib/utils";

const STEPS: Record<"retiro" | "envio", OrderStatus[]> = {
  retiro: ["nuevo", "pagado", "preparando", "listo_retirar", "entregado"],
  envio: ["nuevo", "pagado", "preparando", "en_camino", "entregado"],
};

export function OrderTracking({ id }: { id: string }) {
  const isNew = useSearchParams().get("nuevo") === "1";
  const settings = useSettings();
  const local = useCollection("orders", INTEGRATIONS.dataSource === "demo");
  const [remote, setRemote] = useState<Order | null | undefined>(INTEGRATIONS.dataSource === "demo" ? undefined : undefined);
  const [perm, setPerm] = useState<string>("default");
  const lastStatus = useRef<OrderStatus | null>(null);

  useEffect(() => {
    setPerm(notificationPermission());
    if (INTEGRATIONS.dataSource !== "supabase") return;
    const load = () =>
      fetch(`/api/veterinaria/orders/${id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => setRemote(j?.order ?? null))
        .catch(() => setRemote(null));
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [id]);

  const order = INTEGRATIONS.dataSource === "demo" ? local.items.find((o) => o.id === id) : remote;
  const loading = INTEGRATIONS.dataSource === "demo" ? !local.ready : remote === undefined;

  // Aviso local cuando el estado cambia mientras la página está abierta.
  useEffect(() => {
    if (!order) return;
    if (lastStatus.current && lastStatus.current !== order.status && settings.notifications.enabled) {
      const meta = ORDER_STATUS[order.status];
      localNotify(`Pedido #${order.number}: ${meta.label}`, `${settings.business.name} actualizó tu pedido.`, vetPath(`/pedido/${order.id}`), `order-${order.id}`);
    }
    lastStatus.current = order.status;
  }, [order?.status]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 pt-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-56" />
      </div>
    );
  }
  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <EmptyState icon={<PackageSearch className="size-6" />} title="No encontramos este pedido" text="Si hiciste el pedido desde otro dispositivo, escribinos y te contamos cómo va." action={<ButtonLink href={waLink(settings.business.whatsapp, WA_MESSAGES.help())} external variant="whatsapp">Consultar por WhatsApp</ButtonLink>} />
      </div>
    );
  }

  const steps = STEPS[order.deliveryMethod];
  const cancelled = order.status === "cancelado";
  const currentIndex = Math.max(0, steps.indexOf(order.status === "pago_pendiente" ? "nuevo" : order.status));
  const waOrder = WA_MESSAGES.cart(order.items, order.totals.total, `Pedido #${order.number} · ${DELIVERY_LABEL[order.deliveryMethod]} · ${PAYMENT_LABEL[order.paymentMethod]}${order.address ? `\nDirección: ${order.address.street} ${order.address.number ?? ""}` : ""}\nA nombre de: ${order.customerName}`);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
      {isNew && (
        <div className="mb-5 rounded-[28px] bg-gradient-to-br from-vet-primary to-vet-primary-dark p-6 text-white vet-rise">
          <CheckCircle2 className="size-10" />
          <h1 className="mt-3 font-vet-display text-2xl font-extrabold">¡Gracias! Recibimos tu pedido #{order.number}</h1>
          <p className="mt-1 text-sm text-white/85">Para agilizar, envianos el pedido por WhatsApp y coordinamos {order.deliveryMethod === "envio" ? "la entrega" : "el retiro"} y el pago.</p>
          <a
            href={waLink(settings.business.whatsapp, waOrder)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("whatsapp_click", { context: "order_confirmation", orderId: order.id })}
            className="mt-4 inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-[#0e7a40]"
          >
            <MessageCircle className="size-5" /> Enviar pedido por WhatsApp
          </a>
        </div>
      )}
      {!isNew && <h1 className="mb-4 font-vet-display text-2xl font-extrabold">Pedido #{order.number}</h1>}

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-neutral-500">{formatDateTime(order.createdAt)}</p>
          <Badge tone={ORDER_STATUS[order.status].tone === "red" ? "red" : "teal"}>
            {ORDER_STATUS[order.status].emoji} {ORDER_STATUS[order.status].label}
          </Badge>
        </div>
        {!cancelled && (
          <ol className="mt-5 grid grid-cols-5 gap-1" aria-label="Estado del pedido">
            {steps.map((s, i) => (
              <li key={s} className="flex flex-col items-center text-center">
                <span className={cn("h-1.5 w-full rounded-full", i <= currentIndex ? "bg-vet-primary" : "bg-black/10")} />
                <span className={cn("mt-2 text-[11px] font-semibold leading-tight", i <= currentIndex ? "text-vet-primary-dark" : "text-neutral-400")} aria-current={i === currentIndex ? "step" : undefined}>
                  {ORDER_STATUS[s].label}
                </span>
              </li>
            ))}
          </ol>
        )}
        {order.status === "pago_pendiente" && <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">Pago pendiente: {order.paymentMethod === "transferencia" ? settings.business.bankTransferInfo ?? "te enviamos los datos de transferencia por WhatsApp." : "te enviamos el link de pago por WhatsApp."}</p>}

        {perm !== "granted" && perm !== "unsupported" && settings.notifications.enabled && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={async () => {
              const r = await requestNotifications(["pedido_listo", "pedido_en_camino", "pedido_confirmado"], order.customerId);
              setPerm(r);
            }}
          >
            <Bell className="size-4" /> Avisarme cuando cambie el estado
          </Button>
        )}
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="text-base font-bold">Detalle</h2>
        <ul className="mt-3 divide-y divide-black/5 text-sm">
          {order.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-3 py-2">
              <span className="min-w-0">{it.name}{it.variantLabel ? ` · ${it.variantLabel}` : ""} <span className="text-neutral-500">x{it.quantity}</span></span>
              <span className="shrink-0 tabular-nums">{formatMoney(it.unitPrice * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1.5 border-t border-black/5 pt-3 text-sm">
          {order.totals.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Descuentos</dt><dd>−{formatMoney(order.totals.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-neutral-600">Envío</dt><dd>{order.deliveryMethod === "retiro" ? "Retiro en el local" : order.totals.shipping == null ? "A coordinar" : formatMoney(order.totals.shipping)}</dd></div>
          <div className="flex justify-between text-base font-extrabold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(order.totals.total)}</dd></div>
          {order.totals.pointsEarned > 0 && <p className="text-xs text-vet-primary-dark">Vas a sumar {order.totals.pointsEarned} puntos cuando se entregue 🐾</p>}
        </dl>
        <div className="mt-4 grid gap-1 text-sm text-neutral-600">
          <p><strong className="text-vet-ink">Entrega:</strong> {DELIVERY_LABEL[order.deliveryMethod]}{order.address ? ` · ${order.address.street} ${order.address.number ?? ""}` : ""}</p>
          <p><strong className="text-vet-ink">Pago:</strong> {PAYMENT_LABEL[order.paymentMethod]}</p>
        </div>
      </Card>

      <div className="mt-5 flex flex-wrap gap-2">
        <ButtonLink href={vetPath("/cuenta?tab=pedidos")} variant="outline">Mis pedidos</ButtonLink>
        <ButtonLink href={vetPath("/tienda")} variant="ghost">Seguir comprando</ButtonLink>
        {!isNew && (
          <a href={waLink(settings.business.whatsapp, `Hola, consulto por mi pedido #${order.number}.`)} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-bold text-[#0e7a40]">
            <MessageCircle className="size-4" /> Consultar
          </a>
        )}
      </div>
      <p className="mt-6 text-xs text-neutral-500">
        Guardá este enlace para ver el estado de tu pedido. <Link className="underline" href={vetPath("/cuenta")}>Tu cuenta</Link> también muestra todos tus pedidos.
      </p>
    </div>
  );
}
