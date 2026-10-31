/**
 * API interna para Bloom OS (/api/os/...). Ver docs/API_BLOOM_OS.md.
 * Lecturas y operaciones sobre las mismas tablas y funciones de servidor que usa el POS:
 *  - mesas (abrir / agregar / cerrar): RPC `execute_pos_agent_operation` (stock, comanda, pedido y mesa en una transacción);
 *  - pago de cliente: `applyDebtPayment` (lib/cuenta-corriente.ts), el mismo de /api/clientes/pay.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { applyDebtPayment, getDebtState } from "@/lib/cuenta-corriente";
import { phoneVariants } from "@/lib/phone";
import {
  HttpError, linesTotal, normalizeMethod, parsePeriod, removeFromLines, round2, summarizeSales, todayAR, toDbMethod, topProducts,
} from "./core";

export type Ctx = {
  svc: SupabaseClient;
  url: URL;
  seg: string[]; // segmentos de ruta (ids capturados)
  body: any;
  actor: string;
  idemKey: string | null;
};

export function serviceClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new HttpError(503, "not_configured", "El servidor no tiene configurada la clave de servicio.");
  return createClient(getSupabaseUrl(), key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ── utilidades ──
const isMissingTable = (e: any) => !!e && (e.code === "42P01" || e.code === "PGRST205" || /does not exist|schema cache/i.test(e.message ?? ""));
const migrationPending = () => new HttpError(503, "migration_pending", "Falta aplicar la migración de proveedores y gastos (20261031000000_proveedores_gastos_os.sql).");
function must<T>(res: { data: T; error: any }, what: string): T {
  if (res.error) {
    if (isMissingTable(res.error)) throw migrationPending();
    throw new HttpError(500, "db_error", `${what}: ${res.error.message}`);
  }
  return res.data;
}
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>, what: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const rows = must(await build(from, from + 999), what) ?? [];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
function amountOf(v: unknown, field = "amount") {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 100_000_000) throw new HttpError(400, "bad_amount", `\`${field}\` debe ser un número mayor a 0.`);
  return round2(n);
}
const idOf = (v: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(v)) throw new HttpError(400, "bad_id", "Id inválido.");
  return v;
};
function tableIdOf(v: string) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 100000) throw new HttpError(400, "bad_table", "Número de mesa inválido.");
  return n;
}
const dateOf = (v: unknown, def = todayAR()) => {
  if (v == null || v === "") return def;
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) throw new HttpError(400, "bad_date", "Fecha inválida: usá YYYY-MM-DD.");
  return v;
};
const limitOf = (url: URL, def = 50, max = 200) => Math.max(1, Math.min(Number(url.searchParams.get("limit")) || def, max));

const orderCols = "id,table_id,status,paid,payment_method,order_type,delivery_type,customer_name,total,items,cuenta_corriente,created_at";
const DONE = ["cancelled", "cancelado", "canceled", "completed", "entregado", "delivered", "paid"];

// ═══════════════ LECTURAS ═══════════════
export const reads = {
  async tables({ svc, url }: Ctx) {
    const only = url.searchParams.get("status")?.toUpperCase();
    const rows = must(await svc.from("salon_tables").select("id,status,order_type,guests,total,items,updated_at").order("id"), "mesas") ?? [];
    return rows
      .filter((t: any) => !only || t.status === only)
      .map((t: any) => shapeTable(t, false));
  },
  async table({ svc, seg }: Ctx) {
    const id = tableIdOf(seg[0]);
    const t = must(await svc.from("salon_tables").select("id,status,order_type,guests,total,items,updated_at").eq("id", id).maybeSingle(), "mesa");
    if (!t) throw new HttpError(404, "not_found", "Mesa inexistente.");
    const tickets = must(await svc.from("kitchen_tickets").select("id,status,items,notes,created_at").eq("table_id", id).not("status", "in", "(DELIVERED,CANCELLED)").order("created_at"), "comandas") ?? [];
    return { ...shapeTable(t, true), comandas_abiertas: tickets };
  },
  async activeOrders({ svc, url }: Ctx) {
    const rows = must(await svc.from("orders").select(orderCols).not("status", "in", `(${DONE.join(",")})`).order("created_at", { ascending: false }).limit(limitOf(url, 100, 300)), "pedidos") ?? [];
    return rows.map((o: any) => ({ ...o, items: (o.items ?? []).map(lineOut) }));
  },
  async kitchen({ svc, url }: Ctx) {
    const status = url.searchParams.get("status")?.toUpperCase();
    let q = svc.from("kitchen_tickets").select("id,table_id,order_id,status,items,notes,created_at").order("created_at");
    q = status ? q.eq("status", status) : q.not("status", "in", "(DELIVERED,CANCELLED)");
    return must(await q.limit(limitOf(url, 100, 300)), "comandas") ?? [];
  },
  async salesSummary({ svc, url }: Ctx) {
    const p = periodOf(url);
    const orders = await ordersInRange(svc, p.fromIso, p.toIso);
    return { periodo: { desde: p.from, hasta: p.to }, ...summarizeSales(orders) };
  },
  async salesByDay({ svc, url }: Ctx) {
    const p = periodOf(url);
    const orders = await ordersInRange(svc, p.fromIso, p.toIso);
    const days = new Map<string, any[]>();
    for (const o of orders) {
      const d = new Date(Date.parse((o as any).created_at) - 3 * 3600_000).toISOString().slice(0, 10);
      days.set(d, [...(days.get(d) ?? []), o]);
    }
    return [...days.entries()].sort().map(([dia, os]) => ({ dia, ...summarizeSales(os) }));
  },
  async topProducts({ svc, url }: Ctx) {
    const p = periodOf(url);
    const orders = await ordersInRange(svc, p.fromIso, p.toIso);
    return { periodo: { desde: p.from, hasta: p.to }, productos: topProducts(orders, limitOf(url, 10, 100)) };
  },
  async customers({ svc, url }: Ctx) {
    const q = str(url.searchParams.get("q"), 60);
    const withDebt = url.searchParams.get("with_debt") === "1";
    let query = svc.from("profiles").select("id,full_name,phone,balance,customer_number,coffee_stamps").eq("is_customer", true);
    if (withDebt) query = query.gt("balance", 0);
    if (q) {
      const digits = q.replace(/\D/g, "");
      query = digits.length >= 6
        ? query.in("phone", phoneVariants(q))
        : query.ilike("full_name", `%${q.replace(/[%,()]/g, " ")}%`);
    }
    return must(await query.order(withDebt ? "balance" : "full_name", { ascending: !withDebt }).limit(limitOf(url, 50, 200)), "clientes") ?? [];
  },
  async customer({ svc, seg }: Ctx) {
    const id = idOf(seg[0]);
    const debt = await getDebtState(svc, id);
    if (!debt.exists) throw new HttpError(404, "not_found", "Cliente inexistente.");
    const [pays, orders] = await Promise.all([
      svc.from("payments_history").select("id,amount,method,remaining_balance,created_at,notes").eq("profile_id", id).order("created_at", { ascending: false }).limit(20),
      svc.from("orders").select("id,total,status,paid,payment_method,created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(10),
    ]);
    return {
      id, nombre: debt.name, deuda: debt.effective, saldo_guardado: debt.stored,
      pedidos_de_cuenta_corriente_abiertos: debt.open,
      ultimos_pagos: must(pays, "pagos") ?? [], ultimos_pedidos: must(orders, "pedidos") ?? [],
    };
  },
  async suppliers({ svc }: Ctx) {
    const [sup, pur, pay] = await Promise.all([
      svc.from("suppliers").select("*").order("name"),
      svc.from("supplier_purchases").select("supplier_id,total"),
      svc.from("supplier_payments").select("supplier_id,amount"),
    ]);
    const suppliers = must(sup, "proveedores") ?? [];
    const bought = new Map<string, number>(), paid = new Map<string, number>();
    if (!pur.error) for (const r of pur.data ?? []) bought.set(r.supplier_id, (bought.get(r.supplier_id) ?? 0) + Number(r.total));
    if (!pay.error) for (const r of pay.data ?? []) paid.set(r.supplier_id, (paid.get(r.supplier_id) ?? 0) + Number(r.amount));
    return {
      libro_de_compras_disponible: !pur.error && !pay.error,
      proveedores: suppliers.map((s: any) => ({ ...s, comprado: round2(bought.get(s.id) ?? 0), pagado: round2(paid.get(s.id) ?? 0), saldo_a_pagar: round2((bought.get(s.id) ?? 0) - (paid.get(s.id) ?? 0)) })),
    };
  },
  async supplier({ svc, seg }: Ctx) {
    const id = idOf(seg[0]);
    const s = must(await svc.from("suppliers").select("*").eq("id", id).maybeSingle(), "proveedor");
    if (!s) throw new HttpError(404, "not_found", "Proveedor inexistente.");
    const [pur, pay] = await Promise.all([
      svc.from("supplier_purchases").select("*").eq("supplier_id", id).order("purchase_date", { ascending: false }).limit(100),
      svc.from("supplier_payments").select("*").eq("supplier_id", id).order("payment_date", { ascending: false }).limit(100),
    ]);
    const compras = must(pur, "compras") ?? [], pagos = must(pay, "pagos") ?? [];
    const comprado = compras.reduce((a: number, r: any) => a + Number(r.total), 0);
    const pagado = pagos.reduce((a: number, r: any) => a + Number(r.amount), 0);
    return { proveedor: s, comprado: round2(comprado), pagado: round2(pagado), saldo_a_pagar: round2(comprado - pagado), compras, pagos };
  },
  async expenses({ svc, url }: Ctx) {
    const p = periodOf(url, "month");
    const rows = must(await svc.from("expenses").select("*").gte("expense_date", p.from).lte("expense_date", p.to).order("expense_date", { ascending: false }).limit(1000), "gastos") ?? [];
    const porCategoria: Record<string, number> = {};
    for (const r of rows as any[]) porCategoria[r.category] = round2((porCategoria[r.category] ?? 0) + Number(r.amount));
    return { periodo: { desde: p.from, hasta: p.to }, total: round2((rows as any[]).reduce((a, r) => a + Number(r.amount), 0)), por_categoria: porCategoria, gastos: rows };
  },
  /** Caja del día/período: ingresos por medio (pedidos cobrados + pagos de cuenta corriente) menos egresos. */
  async cash({ svc, url }: Ctx) {
    const p = periodOf(url);
    const orders = (await ordersInRange(svc, p.fromIso, p.toIso)) as any[];
    const ingresos: Record<string, number> = {};
    for (const o of orders) {
      if (o.paid !== true || /^cancel/i.test(o.status ?? "")) continue;
      const m = normalizeMethod(o.payment_method);
      ingresos[m] = round2((ingresos[m] ?? 0) + Number(o.total));
    }
    const egresos: Record<string, number> = {};
    const notas: string[] = ["La apertura y rendición de caja viven en el navegador del POS, no en la base: este resumen se calcula con los movimientos."];
    const exp = await svc.from("expenses").select("*").gte("expense_date", p.from).lte("expense_date", p.to);
    if (exp.error) throw new HttpError(500, "db_error", `gastos: ${exp.error.message}`);
    for (const r of exp.data as any[]) {
      const m = normalizeMethod(r.payment_method ?? "CASH");
      egresos[m] = round2((egresos[m] ?? 0) + Number(r.amount));
      if (r.payment_method == null) notas.push("Los gastos no tienen medio de pago hasta aplicar la migración: se tomaron como efectivo.");
    }
    const sp = await svc.from("supplier_payments").select("amount,method").gte("payment_date", p.from).lte("payment_date", p.to);
    if (sp.error && !isMissingTable(sp.error)) throw new HttpError(500, "db_error", `pagos a proveedores: ${sp.error.message}`);
    if (sp.error) notas.push("Pagos a proveedores no disponibles (falta la migración).");
    else for (const r of sp.data as any[]) { const m = normalizeMethod(r.method); egresos[m] = round2((egresos[m] ?? 0) + Number(r.amount)); }
    const sum = (o: Record<string, number>) => round2(Object.values(o).reduce((a, b) => a + b, 0));
    return {
      periodo: { desde: p.from, hasta: p.to }, ingresos, egresos,
      total_ingresos: sum(ingresos), total_egresos: sum(egresos),
      saldo: round2(sum(ingresos) - sum(egresos)),
      saldo_efectivo: round2((ingresos.EFECTIVO ?? 0) - (egresos.EFECTIVO ?? 0)), notas: [...new Set(notas)],
    };
  },
};

function periodOf(url: URL, defPeriod?: string) {
  const sp = url.searchParams;
  return parsePeriod({ from: sp.get("from"), to: sp.get("to"), period: sp.get("period") ?? defPeriod ?? null });
}
async function ordersInRange(svc: SupabaseClient, fromIso: string, toIso: string) {
  return fetchAll<any>((a, b) => svc.from("orders").select(orderCols).gte("created_at", fromIso).lt("created_at", toIso).order("created_at").range(a, b), "pedidos");
}
const lineOut = (i: any) => ({ product_id: i.product_id ?? i.id, name: i.name, quantity: i.quantity, price: i.price, ...(i.observations ? { notes: i.observations } : {}) });
function shapeTable(t: any, withItems: boolean) {
  const items = (t.items ?? []).filter((i: any) => i?.id !== "meta-customer");
  const meta = (t.items ?? []).find((i: any) => i?.id === "meta-customer");
  return {
    id: t.id, estado: t.status, tipo: t.order_type, personas: t.guests ?? null, total: Number(t.total) || 0,
    cliente: meta?.name ?? null, cantidad_items: items.reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0),
    actualizada: t.updated_at, ...(withItems ? { items: items.map(lineOut) } : {}),
  };
}

// ═══════════════ OPERACIONES ═══════════════
type Line = { product_id: string; quantity: number; notes?: string };
function parseLines(body: any, required = true): Line[] {
  const arr = body?.items;
  if (!Array.isArray(arr) || (required && arr.length === 0)) throw new HttpError(400, "bad_items", "`items` debe ser una lista: [{ product_id, quantity, notes? }].");
  if (arr.length > 60) throw new HttpError(400, "bad_items", "Demasiados productos en una operación (máx. 60).");
  return arr.map((i: any) => {
    const q = Number(i?.quantity ?? 1);
    if (!/^[0-9a-f-]{36}$/i.test(String(i?.product_id ?? ""))) throw new HttpError(400, "bad_items", "Cada item necesita `product_id` (uuid).");
    if (!Number.isInteger(q) || q < 1 || q > 20) throw new HttpError(400, "bad_items", "`quantity` debe ser un entero entre 1 y 20.");
    return { product_id: i.product_id, quantity: q, ...(i.notes ? { notes: str(i.notes, 140) } : {}) };
  });
}
/** Precios y nombres siempre de la base: nunca se confía en los que mande el cliente. */
async function priceLines(svc: SupabaseClient, lines: Line[]) {
  const ids = [...new Set(lines.map((l) => l.product_id))];
  const prods = must(await svc.from("products").select("id,name,price,active").in("id", ids), "productos") ?? [];
  return lines.map((l) => {
    const p: any = prods.find((x: any) => x.id === l.product_id);
    if (!p || p.active === false) throw new HttpError(422, "product_unavailable", `Producto no disponible: ${l.product_id}`);
    return { id: p.id, product_id: p.id, name: p.name, price: Number(p.price), quantity: l.quantity, ...(l.notes ? { observations: l.notes } : {}) };
  });
}
async function actorStaffId(svc: SupabaseClient): Promise<string> {
  const fixed = process.env.BLOOM_OS_STAFF_ID?.trim();
  if (fixed) return idOf(fixed);
  const r = must(await svc.from("profiles").select("id").eq("role", "ADMIN").eq("is_customer", false).not("phone", "is", null).order("created_at", { ascending: true }).limit(1), "administrador") ?? [];
  if (!r[0]) throw new HttpError(503, "no_staff_actor", "No hay un administrador al que atribuir las operaciones (definí BLOOM_OS_STAFF_ID).");
  return r[0].id;
}
async function rpcTable(c: Ctx, id: number, action: "open" | "add" | "close", extra: { additions?: any[]; payment?: string | null; guests?: number | null; message?: string }) {
  const { svc } = c;
  const t = must(await svc.from("salon_tables").select("id,status,updated_at").eq("id", id).maybeSingle(), "mesa");
  if (!t) throw new HttpError(404, "not_found", "Mesa inexistente.");
  const { data, error } = await svc.rpc("execute_pos_agent_operation", {
    p_staff_id: await actorStaffId(svc),
    p_request_key: `os:${c.idemKey}`,
    p_table_id: id,
    p_action: action,
    p_expected_updated_at: t.updated_at,
    p_expected_status: t.status,
    p_additions: extra.additions ?? [],
    p_payment_method: extra.payment ?? null,
    p_message: extra.message ?? "",
    p_guests: extra.guests ?? null,
  });
  if (error) {
    const m = error.message ?? "";
    const known = /Mesa ya abierta|Mesa libre|La mesa cambió|Stock insuficiente|Producto no disponible|Cantidad inválida|Medio de pago/.test(m);
    throw new HttpError(known ? 409 : 500, known ? "table_conflict" : "db_error", m);
  }
  return data;
}

export const writes = {
  async openTable(c: Ctx) {
    const id = tableIdOf(c.seg[0]);
    const items = c.body?.items ? await priceLines(c.svc, parseLines(c.body, false)) : [];
    const guests = c.body?.guests == null ? null : Number(c.body.guests);
    if (guests != null && (!Number.isInteger(guests) || guests < 1 || guests > 50)) throw new HttpError(400, "bad_guests", "`guests` debe ser un entero entre 1 y 50.");
    return rpcTable(c, id, "open", { additions: items, guests });
  },
  async addItems(c: Ctx) {
    const id = tableIdOf(c.seg[0]);
    return rpcTable(c, id, "add", { additions: await priceLines(c.svc, parseLines(c.body)) });
  },
  /** Quita unidades de un producto de la mesa y devuelve su stock (si lo controla). No borra comandas ya enviadas. */
  async removeItem(c: Ctx) {
    const id = tableIdOf(c.seg[0]);
    const productId = String(c.body?.product_id ?? "");
    idOf(productId);
    const qty: number | "all" = c.body?.quantity === "all" || c.body?.quantity == null ? "all" : Number(c.body.quantity);
    if (qty !== "all" && (!Number.isInteger(qty) || qty < 1 || qty > 100)) throw new HttpError(400, "bad_items", "`quantity` debe ser un entero positivo o \"all\".");
    const t: any = must(await c.svc.from("salon_tables").select("id,status,items,updated_at").eq("id", id).maybeSingle(), "mesa");
    if (!t) throw new HttpError(404, "not_found", "Mesa inexistente.");
    if (t.status !== "OCCUPIED") throw new HttpError(409, "table_conflict", "La mesa está libre.");
    const r = removeFromLines(t.items ?? [], productId, qty);
    if (r.removed === 0) throw new HttpError(404, "not_found", "Ese producto no está en la mesa.");
    const total = linesTotal(r.items);
    const upd = must(await c.svc.from("salon_tables").update({ items: r.items, total, updated_at: new Date().toISOString() }).eq("id", id).eq("updated_at", t.updated_at).select("id"), "mesa");
    if (!upd?.length) throw new HttpError(409, "table_conflict", "La mesa cambió mientras se procesaba. Revisala y reintentá.");
    const p: any = must(await c.svc.from("products").select("stock,track_stock,vendidos,total_vendidos").eq("id", productId).maybeSingle(), "producto");
    if (p?.track_stock) {
      await c.svc.from("products").update({
        stock: (Number(p.stock) || 0) + r.removed,
        vendidos: Math.max(0, (Number(p.vendidos) || 0) - r.removed),
        total_vendidos: Math.max(0, (Number(p.total_vendidos) || 0) - r.removed),
      }).eq("id", productId);
    }
    return { success: true, table_id: id, quitadas: r.removed, total };
  },
  /** Manda a cocina una comanda con lo que está en la mesa (o con `items` indicados). */
  async sendToKitchen(c: Ctx) {
    const id = tableIdOf(c.seg[0]);
    const t: any = must(await c.svc.from("salon_tables").select("id,status,items").eq("id", id).maybeSingle(), "mesa");
    if (!t) throw new HttpError(404, "not_found", "Mesa inexistente.");
    if (t.status !== "OCCUPIED") throw new HttpError(409, "table_conflict", "La mesa está libre.");
    const source = c.body?.items ? await priceLines(c.svc, parseLines(c.body)) : (t.items ?? []).filter((i: any) => i?.id !== "meta-customer");
    if (!source.length) throw new HttpError(409, "empty_table", "La mesa no tiene productos para mandar a cocina.");
    const items = source.map((i: any) => ({ name: i.name, quantity: i.quantity, price: i.price, ...(i.observations ? { notes: i.observations } : {}) }));
    const row = must(await c.svc.from("kitchen_tickets").insert({ table_id: id, items, status: "PENDING", notes: str(c.body?.note, 200) || `Enviado por Bloom OS (${c.actor})` }).select("id").single(), "comanda");
    return { success: true, ticket_id: (row as any).id, table_id: id, items: items.length };
  },
  async closeTable(c: Ctx) {
    const id = tableIdOf(c.seg[0]);
    const method = toDbMethod(c.body?.payment_method);
    if (!method) throw new HttpError(400, "bad_payment_method", "`payment_method` debe ser CASH, CARD, BANK_TRANSFER o MERCADO_PAGO.");
    const t: any = must(await c.svc.from("salon_tables").select("id,items").eq("id", id).maybeSingle(), "mesa");
    if (!t) throw new HttpError(404, "not_found", "Mesa inexistente.");
    if (linesTotal(t.items ?? []) <= 0) throw new HttpError(409, "empty_table", "La mesa no tiene productos para cobrar.");
    return rpcTable(c, id, "close", { payment: method });
  },
  async customerPayment(c: Ctx) {
    const id = idOf(c.seg[0]);
    const amount = amountOf(c.body?.amount);
    const method = toDbMethod(c.body?.method);
    if (!method) throw new HttpError(400, "bad_payment_method", "`method` debe ser CASH, CARD, BANK_TRANSFER o MERCADO_PAGO.");
    const r = await applyDebtPayment(c.svc, id, amount, { method, reference: `OS:${c.idemKey}` });
    if (r.status === "error") throw new HttpError(r.message === "Cliente inexistente" ? 404 : 500, "payment_error", r.message);
    if (r.status === "no_debt") throw new HttpError(409, "no_debt", "El cliente no tiene deuda.");
    if (r.status === "duplicate") return { success: true, duplicate: true };
    return { success: true, aplicado: r.applied, excedente: r.excess, deuda_restante: r.remaining };
  },
  async createSupplier(c: Ctx) {
    const name = str(c.body?.name, 120);
    if (!name) throw new HttpError(400, "bad_name", "`name` es obligatorio.");
    const dup = must(await c.svc.from("suppliers").select("id").ilike("name", name).limit(1), "proveedores") ?? [];
    if (dup.length) throw new HttpError(409, "duplicate_supplier", "Ya existe un proveedor con ese nombre.");
    const row: Record<string, unknown> = { name, phone: str(c.body?.phone, 40) || null, email: str(c.body?.email, 120) || null, cuit: str(c.body?.cuit, 20) || null, address: str(c.body?.address, 200) || null };
    // Columnas agregadas por la migración: solo se envían si vienen y la base ya las tiene.
    for (const k of ["contact_name", "category", "notes"]) if (c.body?.[k]) row[k] = str(c.body[k], 200);
    let res = await c.svc.from("suppliers").insert(row).select("id,name").single();
    if (res.error && /column/i.test(res.error.message)) throw migrationPending();
    return must(res as any, "proveedor");
  },
  async registerPurchase(c: Ctx) {
    const supplierId = idOf(String(c.body?.supplier_id ?? ""));
    const total = amountOf(c.body?.total, "total");
    const items = Array.isArray(c.body?.items) ? c.body.items.slice(0, 100).map((i: any) => ({ description: str(i?.description, 120), quantity: Number(i?.quantity) || 1, unit_price: Number(i?.unit_price) || 0 })) : [];
    const paid = c.body?.paid_amount == null ? 0 : amountOf(c.body.paid_amount, "paid_amount");
    if (paid > total) throw new HttpError(400, "bad_amount", "`paid_amount` no puede superar el total.");
    const sup = must(await c.svc.from("suppliers").select("id").eq("id", supplierId).maybeSingle(), "proveedor");
    if (!sup) throw new HttpError(404, "not_found", "Proveedor inexistente.");
    const purchase: any = must(await c.svc.from("supplier_purchases").insert({
      supplier_id: supplierId, purchase_date: dateOf(c.body?.date), total, items, invoice_ref: str(c.body?.invoice_ref, 60) || null, note: str(c.body?.note, 300) || null, created_by: c.actor,
    }).select("id").single(), "compra");
    if (paid > 0) {
      const method = toDbMethod(c.body?.method ?? "CASH");
      const pay = await c.svc.from("supplier_payments").insert({ supplier_id: supplierId, purchase_id: purchase.id, amount: paid, method: method ?? "CASH", payment_date: dateOf(c.body?.date), note: "Pago al registrar la compra", created_by: c.actor });
      if (pay.error) {
        await c.svc.from("supplier_purchases").delete().eq("id", purchase.id); // compensación: no deja la compra a medias
        throw new HttpError(500, "db_error", `pago de la compra: ${pay.error.message}`);
      }
    }
    return { success: true, purchase_id: purchase.id, total, pagado: paid, pendiente: round2(total - paid) };
  },
  async supplierPayment(c: Ctx) {
    const supplierId = idOf(c.seg[0]);
    const amount = amountOf(c.body?.amount);
    const method = toDbMethod(c.body?.method ?? "CASH");
    if (!method) throw new HttpError(400, "bad_payment_method", "`method` debe ser CASH, CARD, BANK_TRANSFER o MERCADO_PAGO.");
    const sup = must(await c.svc.from("suppliers").select("id").eq("id", supplierId).maybeSingle(), "proveedor");
    if (!sup) throw new HttpError(404, "not_found", "Proveedor inexistente.");
    const purchaseId = c.body?.purchase_id ? idOf(String(c.body.purchase_id)) : null;
    const row: any = must(await c.svc.from("supplier_payments").insert({
      supplier_id: supplierId, purchase_id: purchaseId, amount, method, payment_date: dateOf(c.body?.date), note: str(c.body?.note, 300) || null, created_by: c.actor,
    }).select("id").single(), "pago");
    return { success: true, payment_id: row.id, amount };
  },
  async createExpense(c: Ctx) {
    const description = str(c.body?.description, 200);
    const category = str(c.body?.category, 60);
    if (!description || !category) throw new HttpError(400, "bad_expense", "`description` y `category` son obligatorios (ej. category: Luz, Gas, Alquiler).");
    const method = toDbMethod(c.body?.payment_method ?? "CASH");
    if (!method) throw new HttpError(400, "bad_payment_method", "`payment_method` debe ser CASH, CARD, BANK_TRANSFER o MERCADO_PAGO.");
    const row: any = {
      description, category, amount: amountOf(c.body?.amount), expense_date: dateOf(c.body?.date),
      payment_method: method, created_by: c.actor, ...(c.body?.note ? { note: str(c.body.note, 300) } : {}),
      ...(c.body?.supplier_id ? { supplier_id: idOf(String(c.body.supplier_id)) } : {}),
    };
    const res = await c.svc.from("expenses").insert(row).select("id").single();
    if (res.error && /column/i.test(res.error.message)) throw migrationPending();
    return { success: true, expense_id: (must(res as any, "gasto") as any).id, amount: row.amount };
  },
};
