/**
 * Piezas puras de la API de Bloom OS (/api/os): token, períodos, medios de pago y agregaciones.
 * Sin dependencias de Next ni de Supabase para poder probarlas con `node --test`.
 */
import { createHash, timingSafeEqual } from "node:crypto";

export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const sha = (s: string) => createHash("sha256").update(s).digest();

/** Compara el token recibido con el configurado en tiempo constante. */
export function tokenMatches(received: string | null | undefined, expected: string | null | undefined): boolean {
  if (!received || !expected) return false;
  return timingSafeEqual(sha(received), sha(expected));
}

/** Extrae el token de `Authorization: Bearer <token>` (o `X-Bloom-OS-Token`). */
export function extractToken(headers: { get(name: string): string | null }): string | null {
  const auth = headers.get("authorization");
  if (auth) {
    const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
    if (m) return m[1].trim();
  }
  return headers.get("x-bloom-os-token")?.trim() || null;
}

export function cleanActor(raw: string | null | undefined): string {
  const s = (raw ?? "").replace(/[^\p{L}\p{N} _.:@-]/gu, "").trim().slice(0, 80);
  return s || "bloom-os";
}

export function validIdempotencyKey(raw: string | null | undefined): string | null {
  const k = (raw ?? "").trim();
  return /^[A-Za-z0-9_.:-]{8,128}$/.test(k) ? k : null;
}

/** Hash estable de la petición (método + ruta + cuerpo con claves ordenadas). */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}
export const requestHash = (method: string, path: string, body: unknown) =>
  createHash("sha256").update(`${method} ${path} ${canonicalJson(body)}`).digest("hex");

// ── Fechas: el local opera en hora de Argentina (UTC-3, sin horario de verano) ──
const AR_OFFSET_MS = -3 * 3600_000;
export const todayAR = (now = new Date()) => new Date(now.getTime() + AR_OFFSET_MS).toISOString().slice(0, 10);
const isDate = (s: string | null | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);

/** Período [from, to] en fechas AR (inclusive) → rango UTC [fromIso, toIso) listo para filtrar timestamptz. */
export function parsePeriod(params: { from?: string | null; to?: string | null; period?: string | null }, now = new Date()) {
  const today = todayAR(now);
  let from = params.from ?? null;
  let to = params.to ?? null;
  const p = params.period ?? null;
  if (!from && !to) {
    if (p === "week") { from = addDays(today, -6); to = today; }
    else if (p === "month") { from = `${today.slice(0, 8)}01`; to = today; }
    else if (p === "yesterday") { from = to = addDays(today, -1); }
    else { from = to = today; }
  }
  from = from ?? to!;
  to = to ?? from!;
  if (!isDate(from) || !isDate(to)) throw new HttpError(400, "bad_period", "Fechas inválidas: usá YYYY-MM-DD.");
  if (from > to) throw new HttpError(400, "bad_period", "`from` no puede ser posterior a `to`.");
  if ((Date.parse(to) - Date.parse(from)) / 86400_000 > 366) throw new HttpError(400, "bad_period", "El período máximo es 366 días.");
  return {
    from,
    to,
    fromIso: `${from}T00:00:00-03:00`,
    toIso: `${addDays(to, 1)}T00:00:00-03:00`,
  };
}

// ── Medios de pago ──
export type PayMethod = "EFECTIVO" | "TRANSFERENCIA" | "MERCADO_PAGO" | "TARJETA" | "CUENTA_CORRIENTE" | "OTRO";
export function normalizeMethod(raw: unknown): PayMethod {
  const s = String(raw ?? "").trim().toUpperCase();
  if (["CASH", "EFECTIVO"].includes(s)) return "EFECTIVO";
  if (["BANK_TRANSFER", "TRANSFER", "TRANSFERENCIA", "SANTANDER_RIO"].includes(s)) return "TRANSFERENCIA";
  if (["MERCADO_PAGO", "MERCADOPAGO", "MP"].includes(s)) return "MERCADO_PAGO";
  if (["CARD", "TARJETA"].includes(s)) return "TARJETA";
  if (["CUENTA_CORRIENTE", "CC"].includes(s)) return "CUENTA_CORRIENTE";
  return "OTRO";
}
/** Valor que entiende la base/POS (`orders.payment_method`, RPC de cierre). */
export function toDbMethod(raw: unknown): "CASH" | "CARD" | "BANK_TRANSFER" | "MERCADO_PAGO" | null {
  switch (normalizeMethod(raw)) {
    case "EFECTIVO": return "CASH";
    case "TARJETA": return "CARD";
    case "TRANSFERENCIA": return "BANK_TRANSFER";
    case "MERCADO_PAGO": return "MERCADO_PAGO";
    default: return null;
  }
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => Number(v) || 0;
const CANCELLED = new Set(["cancelled", "cancelado", "canceled"]);
const NON_PRODUCT_IDS = new Set(["cc-payment", "meta-customer"]);

export type OrderRow = {
  total: unknown; status?: string | null; paid?: boolean | null; payment_method?: string | null;
  cuenta_corriente?: boolean | null; items?: unknown;
};
export const isCancelled = (o: OrderRow) => CANCELLED.has(String(o.status ?? "").toLowerCase());
const isCcPayment = (o: OrderRow) => Array.isArray(o.items) && (o.items as any[]).some((i) => i?.id === "cc-payment");
const isCcOrder = (o: OrderRow) => o.cuenta_corriente === true || normalizeMethod(o.payment_method) === "CUENTA_CORRIENTE";

/**
 * Ventas del período.
 *  - venta = pedido no cancelado y (cobrado o cargado a cuenta corriente), sin los asientos "Pago Cuenta Corriente".
 *  - pendientes = pedidos no cancelados ni cobrados ni de cuenta corriente (todavía no son venta).
 */
export function summarizeSales(orders: OrderRow[]) {
  const byMethod: Record<string, { cantidad: number; total: number }> = {};
  let total = 0, count = 0, pendingCount = 0, pendingTotal = 0;
  for (const o of orders) {
    if (isCancelled(o) || isCcPayment(o)) continue;
    const t = num(o.total);
    if (o.paid === true || isCcOrder(o)) {
      const m = isCcOrder(o) && o.paid !== true ? "CUENTA_CORRIENTE" : normalizeMethod(o.payment_method);
      byMethod[m] ??= { cantidad: 0, total: 0 };
      byMethod[m].cantidad++; byMethod[m].total = round2(byMethod[m].total + t);
      total += t; count++;
    } else { pendingCount++; pendingTotal += t; }
  }
  return {
    ventas_total: round2(total),
    pedidos: count,
    ticket_promedio: count ? round2(total / count) : 0,
    por_medio_de_pago: byMethod,
    pendientes_de_cobro: { pedidos: pendingCount, total: round2(pendingTotal) },
  };
}

/** Productos más vendidos: expande `orders.items` de las ventas (mismo criterio que summarizeSales). */
export function topProducts(orders: OrderRow[], limit = 10) {
  const acc = new Map<string, { producto: string; unidades: number; importe: number }>();
  for (const o of orders) {
    if (isCancelled(o) || isCcPayment(o) || !(o.paid === true || isCcOrder(o))) continue;
    if (!Array.isArray(o.items)) continue;
    for (const it of o.items as any[]) {
      if (!it || NON_PRODUCT_IDS.has(it.id)) continue;
      const name = String(it.name ?? it.product_name ?? "").trim();
      if (!name) continue;
      const q = num(it.quantity ?? 1);
      const key = String(it.product_id ?? it.id ?? name);
      const cur = acc.get(key) ?? { producto: name, unidades: 0, importe: 0 };
      cur.unidades += q; cur.importe = round2(cur.importe + q * num(it.price));
      acc.set(key, cur);
    }
  }
  return [...acc.values()].sort((a, b) => b.unidades - a.unidades).slice(0, Math.max(1, Math.min(limit, 100)));
}

/** Suma líneas de una mesa: precio * cantidad. */
export const linesTotal = (items: any[]) =>
  round2(items.filter((i) => i && !NON_PRODUCT_IDS.has(i.id)).reduce((s, i) => s + num(i.price) * num(i.quantity), 0));

/** Resta `qty` unidades del producto en la lista (de la última línea a la primera). Devuelve la lista nueva y cuántas se quitaron. */
export function removeFromLines(items: any[], productId: string, qty: number | "all") {
  const out = items.map((i) => ({ ...i }));
  let left = qty === "all" ? Infinity : qty;
  let removed = 0;
  for (let i = out.length - 1; i >= 0 && left > 0; i--) {
    const it = out[i];
    if (String(it.product_id ?? it.id) !== productId || NON_PRODUCT_IDS.has(it.id)) continue;
    const take = Math.min(num(it.quantity), left);
    it.quantity = num(it.quantity) - take; left -= take; removed += take;
  }
  return { items: out.filter((i) => NON_PRODUCT_IDS.has(i.id) || num(i.quantity) > 0), removed };
}
