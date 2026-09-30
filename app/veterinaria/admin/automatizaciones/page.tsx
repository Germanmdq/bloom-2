"use client";
import { useEffect, useMemo, useState } from "react";
import { Bell, Check, MessageCircle, ShoppingCart, Zap } from "lucide-react";
import { toast } from "sonner";
import type { AutomationRule, NotificationKind } from "@/lib/vet/types";
import { INTEGRATIONS } from "@/lib/vet/config/integrations";
import { computePendingActions } from "@/lib/vet/domain/automations";
import { formatDateTime, formatMoney } from "@/lib/vet/domain/format";
import { waLink } from "@/lib/vet/domain/whatsapp";
import { useCollection, useSettings, useVetData } from "@/lib/vet/client/store";
import { Chips, PageHeader, Panel } from "@/components/veterinaria/admin/ui";
import { RequirePermission } from "@/components/veterinaria/admin/AdminShell";
import { Badge, Button, EmptyState, Input, Textarea, Toggle } from "@/components/veterinaria/ui/primitives";

const DONE_KEY = "vdp:automations-done";
const CHANNEL: Record<AutomationRule["channel"], string> = { whatsapp_manual: "WhatsApp (1 toque)", whatsapp_api: "WhatsApp automático", email: "Email", push: "Notificación", interno: "Aviso interno" };
const NOTIF: Record<NotificationKind, string> = {
  pedido_confirmado: "Pedido confirmado", pedido_listo: "Pedido listo para retirar", pedido_en_camino: "Pedido en camino",
  turno_confirmado: "Turno confirmado", turno_proximo: "Turno próximo", promociones: "Promociones", recordatorios: "Recordatorios",
};

export default function AutomatizacionesPage() {
  const settings = useSettings();
  const save = useVetData((s) => s.saveSettings);
  const upsert = useVetData((s) => s.upsert);
  const [tab, setTab] = useState<"hoy" | "reglas" | "carritos" | "notificaciones">("hoy");
  const [done, setDone] = useState<Set<string>>(new Set());
  const c = {
    customers: useCollection("customers"), pets: useCollection("pets"), orders: useCollection("orders"), appointments: useCollection("appointments"),
    services: useCollection("services"), products: useCollection("products"), categories: useCollection("categories"), carts: useCollection("carts"), waitlist: useCollection("waitlist"),
  };
  const ready = Object.values(c).every((x) => x.ready);

  useEffect(() => {
    try {
      setDone(new Set(JSON.parse(localStorage.getItem(DONE_KEY) ?? "[]")));
    } catch {}
  }, []);
  const markDone = (id: string) => {
    const next = new Set(done).add(id);
    setDone(next);
    try {
      localStorage.setItem(DONE_KEY, JSON.stringify([...next].slice(-2000)));
    } catch {}
  };

  const actions = useMemo(
    () =>
      ready
        ? computePendingActions({
            rules: settings.automations, businessName: settings.business.name, siteUrl: INTEGRATIONS.siteUrl,
            customers: c.customers.items, pets: c.pets.items, orders: c.orders.items, appointments: c.appointments.items, services: c.services.items,
            products: c.products.items, categories: c.categories.items, carts: c.carts.items, waitlist: c.waitlist.items, done,
          })
        : [],
    [ready, settings, done, c.customers.items, c.pets.items, c.orders.items, c.appointments.items, c.services.items, c.products.items, c.categories.items, c.carts.items, c.waitlist.items],
  );

  const setRule = (id: AutomationRule["id"], patch: Partial<AutomationRule>) => save({ ...settings, automations: settings.automations.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const openCarts = c.carts.items.filter((x) => !x.recovered).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <RequirePermission perm="automations.manage">
      <PageHeader title="Automatizaciones" subtitle="Recordatorios, cumpleaños, carritos y avisos. Hoy se envían con un toque por WhatsApp; más adelante, solos." />
      <Chips label="Sección" value={tab} onChange={setTab} options={[
        { value: "hoy", label: "Para enviar hoy", count: actions.length },
        { value: "reglas", label: "Reglas y mensajes" },
        { value: "carritos", label: "Carritos abandonados", count: openCarts.length },
        { value: "notificaciones", label: "Notificaciones" },
      ]} />

      <div className="mt-4">
        {tab === "hoy" &&
          (actions.length ? (
            <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {actions.map((a) => (
                <li key={a.id} className="rounded-3xl bg-white p-4 ring-1 ring-black/[0.06]">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{a.title}</p>
                    <Badge tone="gray">{settings.automations.find((r) => r.id === a.kind)?.name}</Badge>
                  </div>
                  {a.detail && <p className="text-sm text-neutral-600">{a.detail}</p>}
                  <p className="mt-2 rounded-2xl bg-vet-surface p-3 text-sm leading-relaxed text-neutral-700">{a.message}</p>
                  <div className="mt-3 flex gap-2">
                    {a.link ? (
                      <a href={a.link} target="_blank" rel="noopener noreferrer" onClick={() => markDone(a.id)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#128C4B] text-sm font-bold text-white"><MessageCircle className="size-4" /> Enviar por WhatsApp</a>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={() => markDone(a.id)}><Check className="size-4" /> Listo</Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Zap className="size-6" />} title="Nada pendiente por hoy" text="Cuando haya turnos para recordar, cumpleaños o carritos sin terminar, aparecen acá." />
          ))}

        {tab === "reglas" && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {settings.automations.map((r) => (
              <Panel key={r.id}>
                <Toggle checked={r.enabled} onChange={(v) => setRule(r.id, { enabled: v })} label={r.name} description={r.description} />
                <div className="mt-3 space-y-3">
                  <Textarea label="Mensaje" defaultValue={r.template} onBlur={(e) => e.target.value !== r.template && setRule(r.id, { template: e.target.value }).then(() => toast.success("Mensaje guardado"))} hint="Variables: {cliente} {mascota} {servicio} {fecha} {hora} {producto} {negocio} {link}" />
                  <div className="grid grid-cols-2 gap-2">
                    {r.days != null && <Input label={r.id === "turno_proximo" ? "Días de anticipación" : r.id === "carrito_abandonado" ? "Días máx. para recordar" : "Días"} type="number" defaultValue={r.days} onBlur={(e) => setRule(r.id, { days: Number(e.target.value) || 0 })} />}
                    {r.id === "cumpleanos" && <Input label="Cupón de regalo (opcional)" defaultValue={r.couponCode ?? ""} onBlur={(e) => setRule(r.id, { couponCode: e.target.value.toUpperCase() })} />}
                  </div>
                  <p className="text-xs text-neutral-500">Canal: {CHANNEL[r.channel]}{r.channel === "whatsapp_manual" ? " · con WhatsApp Business API se podrá enviar solo" : ""}</p>
                </div>
              </Panel>
            ))}
          </div>
        )}

        {tab === "carritos" &&
          (openCarts.length ? (
            <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {openCarts.map((cart) => (
                <li key={cart.id} className="rounded-3xl bg-white p-4 ring-1 ring-black/[0.06]">
                  <div className="flex justify-between gap-2">
                    <p className="font-semibold">{cart.name ?? "Cliente"}</p>
                    <p className="font-bold tabular-nums">{formatMoney(cart.subtotal)}</p>
                  </div>
                  <p className="text-xs text-neutral-500">Última actividad {formatDateTime(cart.updatedAt)}</p>
                  <p className="mt-1 text-sm text-neutral-600">{cart.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</p>
                  <div className="mt-3 flex gap-2">
                    {cart.phone && (
                      <a href={waLink(cart.phone, `Hola ${cart.name?.split(" ")[0] ?? ""}, vimos que dejaste productos en tu carrito de ${settings.business.name}. ¿Te ayudamos a terminar el pedido? ${INTEGRATIONS.siteUrl}/veterinaria/carrito`)} target="_blank" rel="noopener noreferrer" onClick={() => upsert("carts", { ...cart, remindedAt: new Date().toISOString() })} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#128C4B] text-sm font-bold text-white"><MessageCircle className="size-4" /> Recordar</a>
                    )}
                    <Button size="sm" variant="outline" onClick={() => upsert("carts", { ...cart, recovered: true })}>Archivar</Button>
                  </div>
                  {cart.remindedAt && <p className="mt-2 text-xs text-neutral-500">Recordado {formatDateTime(cart.remindedAt)}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<ShoppingCart className="size-6" />} title="No hay carritos abandonados" text="Se registran cuando un cliente con cuenta deja productos sin comprar." />
          ))}

        {tab === "notificaciones" && (
          <Panel title="Notificaciones de la app (PWA)">
            <Toggle checked={settings.notifications.enabled} onChange={(v) => save({ ...settings, notifications: { ...settings.notifications, enabled: v } })} label="Notificaciones activadas" description="Los clientes eligen si las aceptan desde su cuenta o al hacer un pedido." />
            <div className="mt-3 divide-y divide-black/5">
              {(Object.keys(NOTIF) as NotificationKind[]).map((k) => (
                <Toggle key={k} checked={settings.notifications.kinds[k]} onChange={(v) => save({ ...settings, notifications: { ...settings.notifications, kinds: { ...settings.notifications.kinds, [k]: v } } })} label={NOTIF[k]} />
              ))}
            </div>
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-vet-tint p-3 text-sm text-vet-primary-dark">
              <Bell className="mt-0.5 size-4 shrink-0" />
              {INTEGRATIONS.vapidPublicKey ? "Push configurado: las suscripciones se guardan para enviar avisos desde el servidor." : "Hoy funcionan los avisos en el dispositivo del cliente mientras tiene la app abierta. Para enviar push con la app cerrada hay que configurar las claves VAPID (ver guía)."}
            </p>
          </Panel>
        )}
      </div>
    </RequirePermission>
  );
}
