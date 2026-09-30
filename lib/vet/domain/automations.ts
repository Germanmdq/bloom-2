/**
 * Motor de automatizaciones.
 *
 * `computePendingActions` revisa los datos y devuelve la lista de acciones
 * sugeridas para HOY (cumpleaños, recordatorios de turno, recompras,
 * carritos abandonados, stock bajo, lista de espera…).
 *
 * Hoy: la dueña las ve en /veterinaria/admin/automatizaciones y las envía
 * con un toque (WhatsApp prearmado). Mañana: un cron en el servidor puede
 * llamar a esta MISMA función y despacharlas con un `MessageSender`
 * (WhatsApp Business API, email, push) sin reescribir la lógica.
 */
import type {
  AbandonedCart,
  Appointment,
  AutomationKind,
  AutomationRule,
  Category,
  Customer,
  Order,
  Pet,
  Product,
  Service,
  WaitlistEntry,
} from "../types";
import { addDays, daysBetween, nextBirthday, parseDateKey, toDateKey } from "./dates";
import { formatLongDay } from "./format";
import { fillTemplate, waLink } from "./whatsapp";
import { getStockStatus, totalStock } from "./stock";
import { ORDER_STATUS } from "./labels";

export interface PendingAction {
  id: string;
  kind: AutomationKind;
  title: string;
  detail?: string;
  customerName?: string;
  phone?: string;
  message: string;
  /** Enlace listo para enviar (wa.me) cuando el canal es WhatsApp manual. */
  link?: string;
  priority: number;
}

export interface AutomationInput {
  rules: AutomationRule[];
  businessName: string;
  siteUrl: string;
  customers: Customer[];
  pets: Pet[];
  orders: Order[];
  appointments: Appointment[];
  services: Service[];
  products: Product[];
  categories: Category[];
  carts: AbandonedCart[];
  waitlist: WaitlistEntry[];
  /** Ids de acciones ya enviadas (para no repetir). */
  done?: Set<string>;
  now?: Date;
}

export function computePendingActions(input: AutomationInput): PendingAction[] {
  const now = input.now ?? new Date();
  const today = toDateKey(now);
  const rules = new Map(input.rules.map((r) => [r.id, r]));
  const on = (k: AutomationKind) => rules.get(k)?.enabled ?? false;
  const customerById = new Map(input.customers.map((c) => [c.id, c]));
  const serviceById = new Map(input.services.map((s) => [s.id, s]));
  const out: PendingAction[] = [];
  const base = { negocio: input.businessName };
  const push = (a: PendingAction) => {
    if (!input.done?.has(a.id)) out.push(a);
  };
  const optedIn = (c?: Customer) => Boolean(c?.marketingOptIn);

  // Recordatorio de turnos.
  if (on("turno_proximo")) {
    const r = rules.get("turno_proximo")!;
    const target = toDateKey(addDays(now, r.days ?? 1));
    for (const a of input.appointments) {
      if (a.date !== target || !["pendiente", "confirmado"].includes(a.status)) continue;
      const svc = serviceById.get(a.serviceId);
      const message = fillTemplate(r.template, { ...base, cliente: a.customerName.split(" ")[0], mascota: a.petName ?? "tu mascota", servicio: svc?.name, fecha: formatLongDay(a.date).toLowerCase(), hora: a.time });
      push({ id: `turno_proximo:${a.id}`, kind: "turno_proximo", title: `Turno de ${a.petName ?? a.customerName}`, detail: `${svc?.name ?? ""} · ${a.time}`, customerName: a.customerName, phone: a.phone, message, link: waLink(a.phone, message), priority: 1 });
    }
  }

  // Cumpleaños de mascotas.
  if (on("cumpleanos")) {
    const r = rules.get("cumpleanos")!;
    for (const p of input.pets) {
      const next = nextBirthday(p.birthDate, now);
      if (!next || daysBetween(now, next) !== (r.days ?? 0)) continue;
      const owner = customerById.get(p.customerId);
      if (!owner) continue;
      const benefit = r.couponCode ? `Tenemos un beneficio especial para ${p.name}: usá el código ${r.couponCode} 🎁` : "";
      const message = fillTemplate(r.template, { ...base, cliente: owner.name.split(" ")[0], mascota: p.name, beneficio: benefit });
      push({ id: `cumpleanos:${p.id}:${now.getFullYear()}`, kind: "cumpleanos", title: `🎂 Hoy es el cumpleaños de ${p.name}`, detail: owner.name, customerName: owner.name, phone: owner.phone, message, link: waLink(owner.phone, message), priority: 2 });
    }
  }

  // Seguimiento de pedidos listos / en camino.
  if (on("seguimiento_pedido")) {
    const r = rules.get("seguimiento_pedido")!;
    for (const o of input.orders) {
      if (!["listo_retirar", "en_camino"].includes(o.status)) continue;
      const message = fillTemplate(r.template, { ...base, cliente: o.customerName.split(" ")[0], pedido: o.number, estado: ORDER_STATUS[o.status].label.toLowerCase(), link: `${input.siteUrl}/veterinaria/pedido/${o.id}` });
      push({ id: `seguimiento_pedido:${o.id}:${o.status}`, kind: "seguimiento_pedido", title: `Pedido #${o.number} · ${ORDER_STATUS[o.status].label}`, customerName: o.customerName, phone: o.phone, message, link: waLink(o.phone, message), priority: 1 });
    }
  }

  // Lista de espera: ¿se liberó un horario en la fecha preferida?
  if (on("lista_espera")) {
    const r = rules.get("lista_espera")!;
    for (const w of input.waitlist) {
      if (w.status !== "esperando") continue;
      const svc = serviceById.get(w.serviceId);
      const cancelled = input.appointments.find((a) => a.serviceId === w.serviceId && a.status === "cancelado" && a.date >= today && (!w.preferredDate || a.date === w.preferredDate));
      if (!cancelled) continue;
      const message = fillTemplate(r.template, { ...base, cliente: w.name.split(" ")[0], servicio: svc?.name, fecha: formatLongDay(cancelled.date).toLowerCase(), hora: cancelled.time });
      push({ id: `lista_espera:${w.id}:${cancelled.id}`, kind: "lista_espera", title: `Se liberó un turno para ${w.name}`, detail: `${svc?.name ?? ""} · ${cancelled.date} ${cancelled.time}`, customerName: w.name, phone: w.phone, message, link: waLink(w.phone, message), priority: 1 });
    }
  }

  // Carritos abandonados.
  if (on("carrito_abandonado")) {
    const r = rules.get("carrito_abandonado")!;
    for (const c of input.carts) {
      if (c.recovered || !c.phone) continue;
      const hours = (now.getTime() - new Date(c.updatedAt).getTime()) / 3_600_000;
      if (hours < 1 || hours > (r.days ?? 1) * 24 * 3) continue;
      const message = fillTemplate(r.template, { ...base, cliente: c.name?.split(" ")[0] ?? "", link: `${input.siteUrl}/veterinaria/carrito` });
      push({ id: `carrito_abandonado:${c.id}:${c.updatedAt}`, kind: "carrito_abandonado", title: `Carrito sin finalizar de ${c.name ?? "cliente"}`, detail: `${c.items.length} producto(s)`, customerName: c.name, phone: c.phone, message, link: waLink(c.phone, message), priority: 3 });
    }
  }

  // Baño / peluquería: última visita hace >= N días y sin turno futuro.
  if (on("bano")) {
    const r = rules.get("bano")!;
    const groomingIds = new Set(input.services.filter((s) => s.kind === "bano" || s.kind === "peluqueria").map((s) => s.id));
    for (const p of input.pets) {
      const visits = input.appointments.filter((a) => a.petId === p.id && groomingIds.has(a.serviceId));
      if (visits.some((a) => a.date >= today && ["pendiente", "confirmado"].includes(a.status))) continue;
      const last = visits.filter((a) => a.status === "completado").sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!last) continue;
      const since = daysBetween(parseDateKey(last.date), now);
      if (since < (r.days ?? 30) || since > (r.days ?? 30) + 14) continue;
      const owner = customerById.get(p.customerId);
      if (!owner || !optedIn(owner)) continue;
      const message = fillTemplate(r.template, { ...base, cliente: owner.name.split(" ")[0], mascota: p.name, link: `${input.siteUrl}/veterinaria/turnos` });
      push({ id: `bano:${p.id}:${last.id}`, kind: "bano", title: `¿Le toca el baño a ${p.name}?`, detail: `Último: hace ${since} días`, customerName: owner.name, phone: owner.phone, message, link: waLink(owner.phone, message), priority: 4 });
    }
  }

  // Desparasitación (solo recordatorio de consulta, sin indicaciones médicas).
  if (on("desparasitacion")) {
    const r = rules.get("desparasitacion")!;
    const vetIds = new Set(input.services.filter((s) => s.kind === "veterinaria").map((s) => s.id));
    for (const p of input.pets) {
      const last = input.appointments.filter((a) => a.petId === p.id && vetIds.has(a.serviceId) && a.status === "completado").sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!last) continue;
      const since = daysBetween(parseDateKey(last.date), now);
      if (since !== (r.days ?? 90)) continue;
      const owner = customerById.get(p.customerId);
      if (!owner || !optedIn(owner)) continue;
      const message = fillTemplate(r.template, { ...base, cliente: owner.name.split(" ")[0], mascota: p.name, link: `${input.siteUrl}/veterinaria/turnos` });
      push({ id: `desparasitacion:${p.id}:${last.id}`, kind: "desparasitacion", title: `Consulta de control para ${p.name}`, customerName: owner.name, phone: owner.phone, message, link: waLink(owner.phone, message), priority: 5 });
    }
  }

  // Recompra de productos de consumo frecuente.
  if (on("recompra")) {
    const r = rules.get("recompra")!;
    const consumable = new Set(input.categories.filter((c) => c.consumable).map((c) => c.id));
    const productById = new Map(input.products.map((p) => [p.id, p]));
    const lastBuy = new Map<string, { order: Order; productId: string }>();
    for (const o of input.orders) {
      if (!o.customerId || o.status === "cancelado") continue;
      for (const it of o.items) {
        const p = it.productId ? productById.get(it.productId) : undefined;
        if (!p || !consumable.has(p.categoryId)) continue;
        const key = `${o.customerId}:${p.id}`;
        const prev = lastBuy.get(key);
        if (!prev || prev.order.createdAt < o.createdAt) lastBuy.set(key, { order: o, productId: p.id });
      }
    }
    for (const { order, productId } of lastBuy.values()) {
      const since = daysBetween(new Date(order.createdAt), now);
      if (since !== (r.days ?? 30)) continue;
      const owner = customerById.get(order.customerId!);
      const p = productById.get(productId)!;
      if (!owner || !optedIn(owner)) continue;
      const message = fillTemplate(r.template, { ...base, cliente: owner.name.split(" ")[0], producto: p.name, link: `${input.siteUrl}/veterinaria/producto/${p.slug}` });
      push({ id: `recompra:${owner.id}:${p.id}:${order.id}`, kind: "recompra", title: `${owner.name} podría necesitar ${p.name}`, customerName: owner.name, phone: owner.phone, message, link: waLink(owner.phone, message), priority: 4 });
    }
  }

  // Stock bajo (alerta interna).
  if (on("stock_bajo")) {
    const r = rules.get("stock_bajo")!;
    for (const p of input.products) {
      const s = getStockStatus(p);
      if (!p.visible || (s !== "poco" && s !== "sin_stock")) continue;
      const stock = totalStock(p) ?? 0;
      push({ id: `stock_bajo:${p.id}:${stock}`, kind: "stock_bajo", title: s === "sin_stock" ? `🔴 ${p.name} sin stock` : `⚠️ ${p.name}`, message: fillTemplate(r.template, { producto: p.name, stock }), priority: s === "sin_stock" ? 1 : 2 });
    }
  }

  return out.sort((a, b) => a.priority - b.priority);
}

/** Próximos cumpleaños (para el panel y campañas). */
export function upcomingBirthdays(pets: Pet[], now = new Date(), withinDays = 14) {
  return pets
    .map((p) => {
      const next = nextBirthday(p.birthDate, now);
      return next ? { pet: p, date: next, inDays: daysBetween(now, next) } : null;
    })
    .filter((x): x is { pet: Pet; date: Date; inDays: number } => x != null && x.inDays <= withinDays)
    .sort((a, b) => a.inDays - b.inDays);
}
