import { createHmac, timingSafeEqual } from "crypto";

/**
 * Lógica pura del agente de pedidos (sin red ni base): precios, faltantes, resumen, firma y confirmación.
 * Principio: el modelo de lenguaje solo propone QUÉ pide el cliente (por número de producto). Los precios,
 * la disponibilidad, el resumen con el total y la confirmación los resuelve SIEMPRE el servidor.
 */

export type OrderType = "retiro" | "delivery";

export type DraftItem = { id: string; quantity: number; notes?: string };
export type Draft = {
  items: DraftItem[];
  orderType: OrderType | null;
  address: string | null;
  name: string | null;
  phone: string | null;
};

export type MenuProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  /** false = inactivo o sin stock: se conoce pero no se puede pedir */
  available: boolean;
  /** null = sin control de stock */
  stock: number | null;
  options: string;
};

export type PricedLine = { id: string; name: string; quantity: number; unitPrice: number; subtotal: number; notes?: string };

export const emptyDraft = (): Draft => ({ items: [], orderType: null, address: null, name: null, phone: null });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (v: unknown, max: number) => {
  const s = String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  return s || null;
};

/** El borrador viaja por el navegador: se sanea todo lo que llega. */
export function sanitizeDraft(raw: unknown): Draft {
  const r = (raw ?? {}) as Record<string, unknown>;
  const items: DraftItem[] = [];
  for (const it of Array.isArray(r.items) ? r.items.slice(0, 30) : []) {
    const id = String((it as any)?.id ?? "");
    const quantity = Math.floor(Number((it as any)?.quantity));
    if (!UUID.test(id) || !Number.isFinite(quantity) || quantity < 1) continue;
    const notes = clean((it as any)?.notes, 200) ?? undefined;
    items.push({ id: id.toLowerCase(), quantity: Math.min(quantity, 20), ...(notes ? { notes } : {}) });
  }
  return {
    items,
    orderType: r.orderType === "retiro" || r.orderType === "delivery" ? r.orderType : null,
    address: clean(r.address, 300),
    name: clean(r.name, 100),
    phone: clean(r.phone, 30),
  };
}

/** Precia el borrador con los datos de la base. Lo que no existe o no está disponible se quita y se informa. */
export function priceDraft(draft: Draft, menu: Map<string, MenuProduct>) {
  const lines: PricedLine[] = [];
  const problems: string[] = [];
  for (const item of draft.items) {
    const p = menu.get(item.id);
    if (!p) {
      problems.push("Un producto ya no está en la carta.");
      continue;
    }
    if (!p.available) {
      problems.push(`${p.name} está agotado.`);
      continue;
    }
    let quantity = item.quantity;
    if (p.stock !== null && quantity > p.stock) {
      problems.push(`De ${p.name} quedan solo ${p.stock}.`);
      quantity = p.stock;
    }
    if (quantity < 1) continue;
    const existing = lines.find((l) => l.id === p.id && l.notes === item.notes);
    if (existing) {
      existing.quantity += quantity;
      existing.subtotal = round2(existing.unitPrice * existing.quantity);
    } else {
      lines.push({ id: p.id, name: p.name, quantity, unitPrice: p.price, subtotal: round2(p.price * quantity), ...(item.notes ? { notes: item.notes } : {}) });
    }
  }
  return { lines, total: round2(lines.reduce((s, l) => s + l.subtotal, 0)), problems };
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export type Missing = "items" | "orderType" | "address" | "name" | "phone";

export function missingFields(draft: Draft): Missing[] {
  const m: Missing[] = [];
  if (!draft.items.length) m.push("items");
  if (!draft.orderType) m.push("orderType");
  if (draft.orderType === "delivery" && !draft.address) m.push("address");
  if (!draft.name) m.push("name");
  if (draft.orderType === "delivery" && !draft.phone) m.push("phone");
  return m;
}

export const QUESTION: Record<Missing, string> = {
  items: "¿Qué te gustaría pedir?",
  orderType: "¿Es para retirar por el local o para delivery?",
  address: "¿A qué dirección te lo llevamos?",
  name: "¿A nombre de quién lo dejo?",
  phone: "¿Me pasás un teléfono de contacto para el delivery?",
};

const money = (n: number) => `${Math.round(n).toLocaleString("es-AR")} pesos`;

/** Resumen COMPLETO que se le lee al cliente antes de enviar. Lo arma el servidor, no el modelo. */
export function summaryText(lines: PricedLine[], total: number, draft: Draft) {
  const detalle = lines
    .map((l) => `${l.quantity} ${l.name}${l.notes ? ` (${l.notes})` : ""}, ${money(l.subtotal)}`)
    .join("; ");
  const destino =
    draft.orderType === "delivery" ? `Delivery a ${draft.address}` : "Para retirar por el local";
  return `Tu pedido: ${detalle}. Total: ${money(total)}. ${destino}, a nombre de ${draft.name}. ¿Lo confirmás?`;
}

// ---------- Firma: el pedido solo se crea si es EXACTAMENTE lo que se le presentó al cliente ----------

function canonical(draft: Draft, totalCents: number) {
  const items = [...draft.items].sort((a, b) => a.id.localeCompare(b.id) || (a.notes ?? "").localeCompare(b.notes ?? ""));
  return JSON.stringify([items.map((i) => [i.id, i.quantity, i.notes ?? ""]), draft.orderType, draft.address, draft.name, draft.phone, totalCents]);
}

export function signDraft(secret: string, draft: Draft, total: number) {
  return createHmac("sha256", secret).update(canonical(draft, Math.round(total * 100))).digest("hex");
}

export function verifyDraft(secret: string, draft: Draft, total: number, token: string | null | undefined) {
  if (!secret || !token || !/^[0-9a-f]{64}$/.test(token)) return false;
  const expected = Buffer.from(signDraft(secret, draft, total));
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** "Sí" explícito del cliente. Estricto a propósito: ante la duda no se crea el pedido. */
export function isAffirmative(text: string) {
  const t = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[¡!¿?.,;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t || t.length > 40) return false;
  if (/\b(no|pero|cambi|agreg|sac|quit|espera|mejor|ahora)\b/.test(t)) return false;
  return /^(si|sii+|dale|ok|okey|okay|confirmo|confirmado|confirmalo|perfecto|listo|de una|correcto|exacto|asi es|todo bien|mandalo|envialo|enviar|si confirmo|si dale|si perfecto|si correcto|si por favor|si, confirmo)( por favor| gracias)?$/.test(t);
}

/**
 * El modelo ve la carta numerada (#n) solo para elegir productos. Esos números son internos:
 * si se le escapan en la respuesta ("la oferta número 107", "#12"), se reemplazan por el nombre del producto
 * y, si no corresponden a ningún producto, se quitan.
 */
export function humanizeReply(text: string, nameOf: (n: number) => string | undefined) {
  const named = (n: string) => nameOf(Number(n));
  let out = text
    .replace(/(?:la |el |las |los )?(?:oferta|opci[oó]n|producto|[ií]tem|item|combo|promo(?:ci[oó]n)?|n[uú]mero|n[°º]|nro\.?)\s*(?:n[uú]mero\s*|n[°º]\s*|nro\.?\s*)?#?(\d{1,4})\b/gi, (m, n) => {
      const name = named(n);
      return name ? name : "";
    })
    .replace(/#\s?(\d{1,4})\b/g, (m, n) => named(n) ?? "");
  out = out.replace(/\(\s*\)/g, "").replace(/\s{2,}/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
  return out;
}
