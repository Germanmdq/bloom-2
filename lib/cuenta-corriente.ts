import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cuenta corriente de clientes: referencias de pago, validación de montos y aplicación de pagos.
 * La verdad de la deuda es profiles.balance (si es 0 se usa la suma de pedidos de cuenta corriente impagos,
 * misma regla que el panel de clientes).
 */

const CC_PREFIX = "CCPAY";

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** external_reference de la preferencia de pago de saldo. Lo arma SOLO el servidor autenticado. */
export function buildCcReference(customerId: string, amount: number) {
  return `${CC_PREFIX}:${customerId}:${Math.round(amount * 100)}`;
}

export function parseCcReference(ref: string | null | undefined): { customerId: string; cents: number } | null {
  const m = String(ref ?? "").match(/^CCPAY:([0-9a-f-]{36}):(\d{1,12})$/i);
  if (!m) return null;
  const cents = Number(m[2]);
  return cents > 0 ? { customerId: m[1].toLowerCase(), cents } : null;
}

/** ¿El monto realmente acreditado por Mercado Pago coincide con el declarado en la referencia? */
export function creditedMatchesDeclared(credited: number | null | undefined, declaredCents: number) {
  const c = Number(credited);
  return Number.isFinite(c) && Math.abs(Math.round(c * 100) - declaredCents) <= 1;
}

type OpenOrder = { id: string; total: number };

export async function getDebtState(svc: SupabaseClient, customerId: string) {
  const [{ data: profile }, { data: orders }] = await Promise.all([
    svc.from("profiles").select("balance, full_name").eq("id", customerId).maybeSingle(),
    svc
      .from("orders")
      .select("id, total, paid, status, cuenta_corriente, payment_method, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true }),
  ]);
  const open: OpenOrder[] = (orders ?? [])
    .filter(
      (o: any) =>
        (o.cuenta_corriente === true || o.payment_method === "CUENTA_CORRIENTE") &&
        o.paid !== true &&
        !["cancelled", "cancelado"].includes(String(o.status ?? "").toLowerCase()),
    )
    .map((o: any) => ({ id: o.id as string, total: Number(o.total) || 0 }));
  const sumOpen = open.reduce((s, o) => s + o.total, 0);
  const stored = Number(profile?.balance) || 0;
  return {
    exists: Boolean(profile),
    name: (profile?.full_name as string | null) ?? null,
    stored,
    sumOpen,
    effective: round2(stored > 0 ? stored : sumOpen),
    open,
  };
}

export type ApplyResult =
  | { status: "applied"; applied: number; excess: number; remaining: number }
  | { status: "duplicate" }
  | { status: "no_debt"; excess: number }
  | { status: "error"; message: string };

/**
 * Registra un pago de cuenta corriente: movimiento en payments_history, baja del saldo (con control de
 * concurrencia), pedidos cubiertos marcados como pagados y, opcionalmente, asiento en caja.
 * Idempotente por `reference` (se guarda en payments_history.notes).
 */
export async function applyDebtPayment(
  svc: SupabaseClient,
  customerId: string,
  amount: number,
  opts: { method: string; reference: string; cashEntry?: boolean },
): Promise<ApplyResult> {
  const { data: dup } = await svc
    .from("payments_history")
    .select("id")
    .eq("profile_id", customerId)
    .eq("notes", opts.reference)
    .limit(1)
    .maybeSingle();
  if (dup) return { status: "duplicate" };

  let state = await getDebtState(svc, customerId);
  if (!state.exists) return { status: "error", message: "Cliente inexistente" };
  if (state.effective <= 0) return { status: "no_debt", excess: round2(amount) };

  const applied = round2(Math.min(amount, state.effective));
  const excess = round2(amount - applied);

  // 1) Reclamar el movimiento (el índice único sobre notes lo hace atómico cuando la migración está aplicada).
  const { data: claimed, error: claimError } = await svc
    .from("payments_history")
    .insert({
      profile_id: customerId,
      amount: applied,
      method: opts.method,
      remaining_balance: round2(state.effective - applied),
      notes: opts.reference,
    })
    .select("id")
    .single();
  if (claimError) {
    if (claimError.code === "23505") return { status: "duplicate" };
    return { status: "error", message: claimError.message };
  }

  // 2) Bajar el saldo solo si no cambió mientras tanto (hasta 4 intentos).
  let remaining = round2(state.effective - applied);
  let updated = false;
  for (let attempt = 0; attempt < 4 && !updated; attempt++) {
    if (attempt > 0) {
      state = await getDebtState(svc, customerId);
      remaining = round2(Math.max(0, state.effective - applied));
    }
    const { data, error } = await svc
      .from("profiles")
      .update({ balance: remaining })
      .eq("id", customerId)
      .eq("balance", state.stored)
      .select("id");
    if (error) return { status: "error", message: error.message };
    updated = (data?.length ?? 0) > 0;
  }
  if (!updated) return { status: "error", message: "No se pudo actualizar el saldo (concurrencia). Revisar manualmente." };

  await svc.from("payments_history").update({ remaining_balance: remaining }).eq("id", claimed.id);

  // 3) Pedidos de cuenta corriente cubiertos (del más viejo al más nuevo) pasan a pagados.
  const covered = round2(state.sumOpen - remaining);
  let cumulative = 0;
  const paidIds: string[] = [];
  for (const o of state.open) {
    cumulative += o.total;
    if (cumulative <= covered + 0.001) paidIds.push(o.id);
    else break;
  }
  if (paidIds.length) await svc.from("orders").update({ paid: true, status: "paid" }).in("id", paidIds);

  // 4) Asiento en caja (el reporte diario suma ventas desde orders).
  if (opts.cashEntry !== false) {
    await svc.from("orders").insert({
      total: applied,
      payment_method: opts.method,
      status: "completed",
      paid: true,
      customer_id: customerId,
      customer_name: state.name,
      items: [{ id: "cc-payment", name: "Pago Cuenta Corriente", price: applied, quantity: 1 }],
    });
  }

  return { status: "applied", applied, excess, remaining };
}
