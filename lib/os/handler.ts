/**
 * Entrada común de /api/os: autenticación por token, ruteo, idempotencia y registro de operaciones.
 * Las lecturas no llevan Idempotency-Key. Toda operación de escritura la exige y queda en `os_api_log`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanActor, extractToken, HttpError, requestHash, tokenMatches, validIdempotencyKey } from "./core";
import { reads, serviceClient, writes, type Ctx } from "./api";

type Route = { method: "GET" | "POST"; pattern: RegExp; run: (c: Ctx) => Promise<unknown> };
const R = (method: Route["method"], path: string, run: Route["run"]): Route => ({
  method, run, pattern: new RegExp(`^${path.replace(/:id/g, "([^/]+)")}$`),
});

const routes: Route[] = [
  R("GET", "/tables", reads.tables),
  R("GET", "/tables/:id", reads.table),
  R("GET", "/orders/active", reads.activeOrders),
  R("GET", "/kitchen/tickets", reads.kitchen),
  R("GET", "/sales/summary", reads.salesSummary),
  R("GET", "/sales/by-day", reads.salesByDay),
  R("GET", "/sales/top-products", reads.topProducts),
  R("GET", "/customers", reads.customers),
  R("GET", "/customers/:id", reads.customer),
  R("GET", "/suppliers", reads.suppliers),
  R("GET", "/suppliers/:id", reads.supplier),
  R("GET", "/expenses", reads.expenses),
  R("GET", "/cash", reads.cash),
  R("POST", "/tables/:id/open", writes.openTable),
  R("POST", "/tables/:id/items", writes.addItems),
  R("POST", "/tables/:id/items/remove", writes.removeItem),
  R("POST", "/tables/:id/kitchen", writes.sendToKitchen),
  R("POST", "/tables/:id/close", writes.closeTable),
  R("POST", "/customers/:id/payments", writes.customerPayment),
  R("POST", "/suppliers", writes.createSupplier),
  R("POST", "/purchases", writes.registerPurchase),
  R("POST", "/suppliers/:id/payments", writes.supplierPayment),
  R("POST", "/expenses", writes.createExpense),
];

// Limitador de intentos con token inválido (en memoria, por IP): 20 cada 10 minutos.
const bad = new Map<string, { n: number; reset: number }>();
function tooManyBadTokens(ip: string, add: boolean) {
  const now = Date.now();
  let e = bad.get(ip);
  if (!e || e.reset < now) { e = { n: 0, reset: now + 600_000 }; bad.set(ip, e); }
  if (add) e.n++;
  return e.n > 20;
}

const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
const fail = (e: HttpError) => json(e.status, { error: { code: e.code, message: e.message } });

async function claim(svc: SupabaseClient, row: Record<string, unknown>) {
  const ins = await svc.from("os_api_log").insert(row).select("id").single();
  if (!ins.error) return { id: (ins.data as any).id as string };
  if (ins.error.code === "23505") {
    const { data: prev } = await svc.from("os_api_log").select("request_hash,status,response").eq("idempotency_key", row.idempotency_key as string).maybeSingle();
    if (!prev) throw new HttpError(409, "in_progress", "La operación se está procesando. Reintentá en unos segundos.");
    if (prev.request_hash !== row.request_hash) throw new HttpError(422, "idempotency_key_reused", "Esa Idempotency-Key ya se usó con otra petición.");
    if (prev.status == null) throw new HttpError(409, "in_progress", "La operación se está procesando. Reintentá en unos segundos.");
    return { replay: { status: prev.status as number, response: prev.response } };
  }
  if (/relation .* does not exist|os_api_log/.test(ins.error.message) || ins.error.code === "42P01" || ins.error.code === "PGRST205") {
    throw new HttpError(503, "migration_pending", "Las operaciones de escritura necesitan la migración 20261031000000_proveedores_gastos_os.sql (registro e idempotencia).");
  }
  throw new HttpError(500, "db_error", ins.error.message);
}

export async function handleOs(req: Request, pathSegs: string[]): Promise<Response> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  try {
    const expected = process.env.BLOOM_OS_API_TOKEN?.trim();
    if (!expected) throw new HttpError(503, "not_configured", "La API de Bloom OS no está configurada.");
    if (tooManyBadTokens(ip, false)) throw new HttpError(429, "rate_limited", "Demasiados intentos. Esperá unos minutos.");
    if (!tokenMatches(extractToken(req.headers), expected)) {
      tooManyBadTokens(ip, true);
      throw new HttpError(401, "unauthorized", "Token inválido o ausente.");
    }

    const path = `/${pathSegs.join("/")}`;
    const method = req.method === "GET" ? "GET" : req.method === "POST" ? "POST" : null;
    if (!method) throw new HttpError(405, "method_not_allowed", "Solo GET y POST.");
    let route: Route | undefined, seg: string[] = [], pathExists = false;
    for (const r of routes) {
      const m = r.pattern.exec(path);
      if (!m) continue;
      pathExists = true;
      if (r.method === method) { route = r; seg = m.slice(1).map(decodeURIComponent); break; }
    }
    if (!route) throw pathExists ? new HttpError(405, "method_not_allowed", "Método no permitido para esa ruta.") : new HttpError(404, "not_found", "Ruta inexistente.");

    const svc = serviceClient();
    const url = new URL(req.url);
    const actor = cleanActor(req.headers.get("x-bloom-os-actor"));
    let body: any = {};
    if (method === "POST") {
      body = await req.json().catch(() => { throw new HttpError(400, "bad_json", "El cuerpo debe ser JSON."); });
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "bad_json", "El cuerpo debe ser un objeto JSON.");
    }

    if (method === "GET") {
      const data = await route.run({ svc, url, seg, body, actor, idemKey: null });
      return json(200, { data });
    }

    const key = validIdempotencyKey(req.headers.get("idempotency-key"));
    if (!key) throw new HttpError(400, "idempotency_key_required", "Las operaciones de escritura exigen la cabecera Idempotency-Key (8–128 caracteres: letras, números, _ . : -).");
    const hash = requestHash(method, path, body);
    const claimed = await claim(svc, { actor, method, path, idempotency_key: key, request_hash: hash, request: body });
    if ("replay" in claimed && claimed.replay) return json(claimed.replay.status, claimed.replay.response, { "idempotent-replay": "true" });
    const logId = (claimed as { id: string }).id;

    let status = 200, response: unknown;
    try {
      response = { data: await route.run({ svc, url, seg, body, actor, idemKey: key }) };
    } catch (e) {
      const he = e instanceof HttpError ? e : new HttpError(500, "internal_error", "Error interno.");
      if (!(e instanceof HttpError)) console.error("[os-api]", path, e);
      status = he.status; response = { error: { code: he.code, message: he.message } };
    }
    // Un error 5xx no se memoriza: se conserva en el registro, pero la clave queda libre para reintentar.
    await svc.from("os_api_log").update({
      status, response, finished_at: new Date().toISOString(),
      ...(status >= 500 ? { idempotency_key: `${key}#fallo:${logId}` } : {}),
    }).eq("id", logId);
    console.log(`[os-api] ${actor} ${method} ${path} -> ${status}`);
    return json(status, response);
  } catch (e) {
    if (e instanceof HttpError) return fail(e);
    console.error("[os-api] unexpected", e);
    return fail(new HttpError(500, "internal_error", "Error interno."));
  }
}
