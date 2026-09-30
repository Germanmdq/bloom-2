"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, ClipboardList, MapPin, MessageCircle, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Order, OrderStatus, PaymentMethod } from "@/lib/vet/types";
import { adminPath, INTEGRATIONS } from "@/lib/vet/config/integrations";
import { formatDate, formatDateTime, formatMoney } from "@/lib/vet/domain/format";
import { DELIVERY_LABEL, nextOrderStatus, ORDER_FLOW, ORDER_STATUS, PAYMENT_LABEL } from "@/lib/vet/domain/labels";
import { fillTemplate, waLink } from "@/lib/vet/domain/whatsapp";
import { createProductSearch } from "@/lib/vet/domain/search";
import { unitPriceOf } from "@/lib/vet/domain/pricing";
import { canPurchase } from "@/lib/vet/domain/stock";
import { useCollection, useSettings } from "@/lib/vet/client/store";
import { useStaffRole } from "@/lib/vet/client/session";
import { placeOrder, updateOrderStatus } from "@/lib/vet/client/actions";
import { Badge, Button, EmptyState, Input, QuantityStepper, Select, Sheet, Skeleton, Textarea } from "../ui/primitives";
import { Chips, PageHeader, SearchBox } from "./ui";
import { cn } from "@/lib/utils";

type Filter = "activos" | OrderStatus | "todos";
const ACTIVE: OrderStatus[] = ["nuevo", "pago_pendiente", "pagado", "preparando", "en_camino", "listo_retirar"];

export function OrdersAdmin() {
  const params = useSearchParams();
  const router = useRouter();
  const orders = useCollection("orders");
  const [filter, setFilter] = useState<Filter>("activos");
  const [q, setQ] = useState("");
  const openId = params.get("id");
  const creating = params.get("nuevo") === "1";
  const selected = orders.items.find((o) => o.id === openId) ?? null;

  const counts = useMemo(() => {
    const c: Record<string, number> = { activos: 0, todos: orders.items.length };
    for (const o of orders.items) {
      c[o.status] = (c[o.status] ?? 0) + 1;
      if (ACTIVE.includes(o.status)) c.activos++;
    }
    return c;
  }, [orders.items]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return orders.items
      .filter((o) => (filter === "todos" ? true : filter === "activos" ? ACTIVE.includes(o.status) : o.status === filter))
      .filter((o) => !t || o.customerName.toLowerCase().includes(t) || String(o.number).includes(t) || o.phone.replace(/\D/g, "").includes(t.replace(/\D/g, "") || "§"))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [orders.items, filter, q]);

  const go = (qs: string) => router.replace(adminPath(`/pedidos${qs}`), { scroll: false });

  return (
    <div>
      <PageHeader title="Pedidos" subtitle="Tocá un pedido para ver el detalle y cambiar su estado." actions={<Button onClick={() => go("?nuevo=1")}><Plus className="size-4" /> Nuevo pedido</Button>} />
      <div className="mb-3 flex gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por cliente, número o teléfono" label="Buscar pedidos" />
      </div>
      <Chips
        label="Filtrar por estado"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "activos", label: "En curso", count: counts.activos },
          ...ORDER_FLOW.map((s) => ({ value: s as Filter, label: `${ORDER_STATUS[s].emoji} ${ORDER_STATUS[s].label}`, count: counts[s] ?? 0 })),
          { value: "todos", label: "Todos", count: counts.todos },
        ]}
      />

      <div className="mt-4">
        {!orders.ready ? (
          <Skeleton className="h-64" />
        ) : list.length ? (
          <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {list.slice(0, 200).map((o) => {
              const next = nextOrderStatus(o.status, o.deliveryMethod);
              return (
                <li key={o.id} className="rounded-3xl bg-white p-4 ring-1 ring-black/[0.06]">
                  <button type="button" onClick={() => go(`?id=${o.id}`)} className="flex w-full items-start gap-3 text-left">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm">
                        <span className="font-extrabold tabular-nums">#{o.number}</span>
                        <span className="text-neutral-500">{formatDate(o.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                        {o.demo && <Badge tone="amber">Ejemplo</Badge>}
                      </p>
                      <p className="mt-0.5 truncate font-semibold">{o.customerName}</p>
                      <p className="truncate text-xs text-neutral-500">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold tabular-nums">{formatMoney(o.totals.total)}</p>
                      <Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].emoji} {ORDER_STATUS[o.status].label}</Badge>
                      <p className="mt-1 text-[11px] text-neutral-500">{o.deliveryMethod === "envio" ? "🚚 Envío" : "🏪 Retiro"}</p>
                    </div>
                  </button>
                  {next && (
                    <button type="button" onClick={async () => { await updateOrderStatus(o, next); toast.success(`Pedido #${o.number}: ${ORDER_STATUS[next].label}`); }} className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl bg-vet-tint text-sm font-bold text-vet-primary-dark hover:bg-vet-tint-strong">
                      Marcar {ORDER_STATUS[next].label.toLowerCase()} <ArrowRight className="size-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={<ClipboardList className="size-6" />} title="No hay pedidos con este filtro" />
        )}
      </div>

      <OrderDetail order={selected} onClose={() => go("")} />
      {creating && <NewOrderSheet onClose={() => go("")} onCreated={(id) => go(`?id=${id}`)} />}
    </div>
  );
}

function OrderDetail({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const settings = useSettings();
  const { name } = useStaffRole();
  const [busy, setBusy] = useState(false);
  if (!order) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const rule = settings.automations.find((r) => r.id === "seguimiento_pedido");
  const msg = fillTemplate(rule?.template ?? "Hola {cliente}, tu pedido #{pedido} está {estado}.", {
    cliente: order.customerName.split(" ")[0],
    pedido: order.number,
    estado: ORDER_STATUS[order.status].label.toLowerCase(),
    negocio: settings.business.name,
    link: `${INTEGRATIONS.siteUrl}/veterinaria/pedido/${order.id}`,
  });
  const change = async (s: OrderStatus) => {
    setBusy(true);
    try {
      await updateOrderStatus(order, s, name);
      toast.success(`Estado: ${ORDER_STATUS[s].label}`);
    } finally {
      setBusy(false);
    }
  };
  const next = nextOrderStatus(order.status, order.deliveryMethod);

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Pedido #${order.number}`}
      wide
      footer={
        <div className="grid grid-cols-2 gap-2">
          <a href={waLink(order.phone, msg)} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#128C4B] text-sm font-bold text-white">
            <MessageCircle className="size-5" /> Avisar al cliente
          </a>
          {next ? (
            <Button size="lg" loading={busy} onClick={() => change(next)}>{ORDER_STATUS[next].emoji} {ORDER_STATUS[next].label}</Button>
          ) : (
            <a href={`tel:${order.phone.replace(/[^\d+]/g, "")}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold ring-1 ring-black/10"><Phone className="size-5" /> Llamar</a>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={ORDER_STATUS[order.status].tone}>{ORDER_STATUS[order.status].emoji} {ORDER_STATUS[order.status].label}</Badge>
          <span className="text-sm text-neutral-500">{formatDateTime(order.createdAt)} · {order.source === "web" ? "Tienda online" : order.source === "admin" ? "Cargado en el panel" : "WhatsApp"}</span>
        </div>

        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-neutral-600">Cambiar estado</legend>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {ORDER_FLOW.map((s) => (
              <button key={s} type="button" disabled={busy} onClick={() => change(s)} aria-pressed={order.status === s} className={cn("min-h-11 rounded-xl px-2 text-[13px] font-semibold ring-1 transition", order.status === s ? "bg-vet-ink text-white ring-vet-ink" : "bg-white ring-black/10 hover:ring-vet-primary/40", s === "cancelado" && order.status !== s && "text-red-700")}>
                {ORDER_STATUS[s].emoji} {ORDER_STATUS[s].label}
              </button>
            ))}
          </div>
          {order.status === "cancelado" && <p className="mt-2 text-xs text-neutral-500">Al cancelar se repone el stock de los productos controlados.</p>}
        </fieldset>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-vet-surface p-3 text-sm">
            <p className="font-bold">{order.customerName}</p>
            <p className="text-neutral-600">{order.phone}</p>
            {order.email && <p className="text-neutral-600">{order.email}</p>}
          </div>
          <div className="rounded-2xl bg-vet-surface p-3 text-sm">
            <p className="font-bold">{DELIVERY_LABEL[order.deliveryMethod]}</p>
            {order.address && (
              <p className="flex items-start gap-1 text-neutral-600"><MapPin className="mt-0.5 size-3.5 shrink-0" /> {order.address.street} {order.address.number} {order.address.floor}{order.address.notes ? ` · ${order.address.notes}` : ""}</p>
            )}
            <p className="text-neutral-600">Pago: {PAYMENT_LABEL[order.paymentMethod]}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <caption className="sr-only">Productos del pedido</caption>
          <thead><tr className="text-left text-xs text-neutral-500"><th className="pb-1 font-medium">Producto</th><th className="pb-1 text-right font-medium">Cant.</th><th className="pb-1 text-right font-medium">Total</th></tr></thead>
          <tbody className="divide-y divide-black/5">
            {order.items.map((i, k) => (
              <tr key={k}><td className="py-2 pr-2">{i.name}{i.variantLabel ? <span className="text-neutral-500"> · {i.variantLabel}</span> : null}</td><td className="py-2 text-right tabular-nums">{i.quantity}</td><td className="py-2 text-right tabular-nums">{formatMoney(i.unitPrice * i.quantity)}</td></tr>
            ))}
          </tbody>
        </table>
        <dl className="space-y-1 border-t border-black/5 pt-2 text-sm">
          <div className="flex justify-between"><dt className="text-neutral-600">Subtotal</dt><dd className="tabular-nums">{formatMoney(order.totals.subtotal)}</dd></div>
          {order.totals.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Descuentos{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd className="tabular-nums">−{formatMoney(order.totals.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-neutral-600">Envío</dt><dd>{order.deliveryMethod === "retiro" ? "—" : order.totals.shipping == null ? "A coordinar" : formatMoney(order.totals.shipping)}</dd></div>
          <div className="flex justify-between text-base font-extrabold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(order.totals.total)}</dd></div>
        </dl>
        {order.notes && <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-950"><strong>Observaciones:</strong> {order.notes}</p>}

        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-neutral-600">Historial de estados</summary>
          <ul className="mt-2 space-y-1 text-neutral-600">
            {order.statusHistory.map((h, i) => (
              <li key={i}>{formatDateTime(h.at)} · {ORDER_STATUS[h.status].label}{h.by ? ` · ${h.by}` : ""}</li>
            ))}
          </ul>
        </details>
      </div>
    </Sheet>
  );
}

function NewOrderSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const products = useCollection("products");
  const categories = useCollection("categories");
  const customers = useCollection("customers");
  const zones = useCollection("shippingZones");
  const settings = useSettings();
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<{ productId: string; variantId?: string; quantity: number }[]>([]);
  const [c, setC] = useState({ name: "", phone: "", delivery: "retiro" as Order["deliveryMethod"], zoneId: "", street: "", number: "", payment: "efectivo" as PaymentMethod, notes: "" });
  const [saving, setSaving] = useState(false);

  const search = useMemo(() => (products.ready ? createProductSearch(products.items, categories.items) : null), [products.ready, products.items, categories.items]);
  const results = q.trim() && search ? search(q, 8).map((r) => r.item) : [];
  const total = lines.reduce((s, l) => {
    const p = products.items.find((x) => x.id === l.productId);
    return s + (p ? (unitPriceOf(p, l.variantId) ?? 0) * l.quantity : 0);
  }, 0);
  const suggestions = c.phone.replace(/\D/g, "").length >= 4 ? customers.items.filter((x) => x.phone.replace(/\D/g, "").includes(c.phone.replace(/\D/g, ""))).slice(0, 3) : [];

  return (
    <Sheet
      open
      onClose={onClose}
      title="Nuevo pedido"
      wide
      footer={
        <Button
          size="lg"
          className="w-full"
          loading={saving}
          disabled={!lines.length}
          onClick={async () => {
            if (c.name.trim().length < 2 || c.phone.replace(/\D/g, "").length < 8) return toast.error("Completá nombre y teléfono del cliente");
            setSaving(true);
            try {
              const o = await placeOrder({
                lines,
                customer: { name: c.name, phone: c.phone },
                deliveryMethod: c.delivery,
                zoneId: c.delivery === "envio" ? c.zoneId || zones.items[0]?.id : undefined,
                address: c.delivery === "envio" ? { street: c.street, number: c.number } : undefined,
                paymentMethod: c.payment,
                notes: c.notes,
                source: "admin",
              });
              toast.success(`Pedido #${o.number} creado`);
              onCreated(o.id);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "No se pudo crear");
            } finally {
              setSaving(false);
            }
          }}
        >
          Crear pedido · {formatMoney(total)}
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <SearchBox value={q} onChange={setQ} placeholder="Buscar producto para agregar" label="Buscar producto" />
          {results.length > 0 && (
            <ul className="mt-2 divide-y divide-black/5 rounded-2xl ring-1 ring-black/[0.06]">
              {results.map((p) =>
                (p.variants.length ? p.variants : [null]).map((v) => {
                  const ok = canPurchase({ ...p, requiresConsultation: false }, v?.id);
                  return (
                    <li key={p.id + (v?.id ?? "")}>
                      <button type="button" disabled={!ok} onClick={() => { setLines((ls) => { const i = ls.findIndex((l) => l.productId === p.id && l.variantId === v?.id); return i >= 0 ? ls.map((l, k) => (k === i ? { ...l, quantity: l.quantity + 1 } : l)) : [...ls, { productId: p.id, variantId: v?.id, quantity: 1 }]; }); setQ(""); }} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-vet-tint/40 disabled:opacity-40">
                        <span className="truncate">{p.name}{v ? ` · ${v.label}` : ""}</span>
                        <span className="shrink-0 font-semibold tabular-nums">{formatMoney(unitPriceOf(p, v?.id))}</span>
                      </button>
                    </li>
                  );
                }),
              )}
            </ul>
          )}
        </div>
        {lines.length > 0 && (
          <ul className="space-y-2">
            {lines.map((l, i) => {
              const p = products.items.find((x) => x.id === l.productId)!;
              const v = p.variants.find((x) => x.id === l.variantId);
              return (
                <li key={i} className="flex items-center gap-2 rounded-2xl bg-vet-surface p-2 pl-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{p.name}{v ? ` · ${v.label}` : ""}</span>
                  <QuantityStepper size="sm" value={l.quantity} onChange={(qty) => setLines((ls) => (qty < 1 ? ls.filter((_, k) => k !== i) : ls.map((x, k) => (k === i ? { ...x, quantity: qty } : x))))} />
                  <button type="button" onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))} className="grid size-9 place-items-center rounded-full text-neutral-400 hover:text-red-600" aria-label="Quitar"><Trash2 className="size-4" /></button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Teléfono del cliente" type="tel" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} />
          <Input label="Nombre" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:col-span-2">
              {suggestions.map((s) => (
                <button key={s.id} type="button" onClick={() => setC({ ...c, name: s.name, phone: s.phone, street: s.address?.street ?? "", number: s.address?.number ?? "" })} className="h-9 rounded-full bg-vet-tint px-3 text-xs font-semibold text-vet-primary-dark">{s.name} · {s.phone}</button>
              ))}
            </div>
          )}
          <Select label="Entrega" value={c.delivery} onChange={(e) => setC({ ...c, delivery: e.target.value as Order["deliveryMethod"] })}>
            <option value="retiro">Retiro en el local</option>
            <option value="envio">Envío a domicilio</option>
          </Select>
          <Select label="Pago" value={c.payment} onChange={(e) => setC({ ...c, payment: e.target.value as PaymentMethod })}>
            {settings.business.paymentMethods.map((m) => <option key={m} value={m}>{PAYMENT_LABEL[m]}</option>)}
          </Select>
          {c.delivery === "envio" && (
            <>
              <Select label="Zona" value={c.zoneId} onChange={(e) => setC({ ...c, zoneId: e.target.value })}>
                {zones.items.map((z) => <option key={z.id} value={z.id}>{z.name} · {z.price != null ? formatMoney(z.price) : "a coordinar"}</option>)}
              </Select>
              <Input label="Dirección" value={c.street} onChange={(e) => setC({ ...c, street: e.target.value })} />
            </>
          )}
          <Textarea label="Observaciones" className="sm:col-span-2" value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} />
        </div>
      </div>
    </Sheet>
  );
}
