/** Mesas virtuales POS para pedidos web (OrderSheet / WebOrderList). */
export const WEB_ORDER_TABLE_RETIRO = 5000;
export const WEB_ORDER_TABLE_DELIVERY = 5001;

function normTableId(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isWebChannelOrder(o: {
  table_id?: unknown;
  order_type?: string | null;
}): boolean {
  const ot = String(o.order_type ?? "").trim().toLowerCase();
  if (ot === "web") return true;
  const tid = normTableId(o.table_id);
  if (ot === "" && (tid === WEB_ORDER_TABLE_DELIVERY || tid === WEB_ORDER_TABLE_RETIRO)) return true;
  return false;
}

function isDeliveryChannel(o: {
  delivery_type?: string | null;
  delivery_info?: string | null;
}): boolean {
  const dt = String(o.delivery_type ?? "").trim().toLowerCase();
  if (dt === "delivery") return true;
  const info = String(o.delivery_info ?? "").toLowerCase();
  if (info.includes("delivery a:")) return true;
  return false;
}

function isRetiroChannel(o: {
  delivery_type?: string | null;
  delivery_info?: string | null;
}): boolean {
  const dt = String(o.delivery_type ?? "").trim().toLowerCase();
  if (dt === "local" || dt === "retiro") return true;
  const info = String(o.delivery_info ?? "").toLowerCase();
  if (info.includes("retiro en local")) return true;
  return false;
}

/**
 * Incluye filas antiguas con `table_id` null pero pedido web; tolera `order_type` / `delivery_type` raros
 * y heurística en `delivery_info` (menú guarda "Delivery a: …").
 */
export function orderMatchesWebVirtualTable(
  o: {
    table_id?: unknown;
    delivery_type?: string | null;
    order_type?: string | null;
    delivery_info?: string | null;
  },
  virtualTableId: number
): boolean {
  const tid = normTableId(o.table_id);
  if (tid === virtualTableId) return true;
  if (!isWebChannelOrder(o)) return false;
  if (tid != null && tid !== virtualTableId) return false;
  if (virtualTableId === WEB_ORDER_TABLE_DELIVERY) return isDeliveryChannel(o);
  if (virtualTableId === WEB_ORDER_TABLE_RETIRO) return isRetiroChannel(o);
  return false;
}
