import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { formatPhone, normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { getnetConfig, simulationEnabled } from "@/lib/getnet";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  created_at: string;
  total: number | string | null;
  items: unknown;
  status: string | null;
  paid: boolean | null;
  cuenta_corriente: boolean | null;
  payment_method: string | null;
  delivery_type: string | null;
  order_type: string | null;
};

const METHOD_LABEL: Record<string, string> = {
  GETNET: "Getnet",
  MERCADO_PAGO: "Mercado Pago",
  CASH: "efectivo",
  CARD: "tarjeta",
  TRANSFER: "transferencia",
  BANK_TRANSFER: "transferencia",
  SIMULADO: "demo",
};

type PaymentStatus = "pagado" | "pendiente" | "parcial" | "cancelado";

const isPaymentItem = (item: any) =>
  String(item?.id ?? "") === "cc-payment" || /abono cuenta corriente|pago cuenta corriente/i.test(String(item?.name ?? ""));
const isPaymentOrder = (o: OrderRow) => Array.isArray(o.items) && (o.items as any[]).some(isPaymentItem);
const isCurrentAccount = (o: OrderRow) => o.cuenta_corriente === true || o.payment_method === "CUENTA_CORRIENTE";
const isCancelled = (o: OrderRow) => ["cancelled", "cancelado"].includes(String(o.status ?? "").toLowerCase());

/** Devuelve el usuario logueado si es un cliente; si no, la respuesta de error. */
async function requireCustomer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  return { supabase, user };
}

/**
 * Lectura con la sesión del propio cliente: las políticas RLS garantizan que solo ve sus datos.
 * "Pago parcial": el saldo (profiles.balance) es la verdad; lo ya cobrado de la deuda abierta se
 * asigna a los pedidos de cuenta corriente impagos del más viejo al más nuevo.
 */
export async function GET() {
  const auth = await requireCustomer();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const [profileRes, ordersRes, paymentsRes] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, default_address, balance, is_customer").eq("id", user.id).maybeSingle(),
    supabase
      .from("orders")
      .select("id, created_at, total, items, status, paid, cuenta_corriente, payment_method, delivery_type, order_type")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("payments_history")
      .select("id, amount, method, remaining_balance, created_at, notes")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (profileRes.error || !profileRes.data) {
    return NextResponse.json({ error: "No se encontró tu perfil." }, { status: 404 });
  }
  if (!profileRes.data.is_customer) {
    return NextResponse.json({ error: "Esta sección es solo para clientes." }, { status: 403 });
  }
  if (ordersRes.error) console.error("[cuenta] orders", ordersRes.error.message);
  if (paymentsRes.error) console.error("[cuenta] payments", paymentsRes.error.message);

  const all = (ordersRes.data ?? []) as OrderRow[];
  const saleOrders = all.filter((o) => !isPaymentOrder(o));
  // Los pagos registrados por el sistema ("cc-payment") ya figuran en payments_history; solo se suman
  // como movimiento los "ABONO CUENTA CORRIENTE" del panel, que no dejan registro en esa tabla.
  const abonoOrders = all.filter(
    (o) => isPaymentOrder(o) && !(o.items as any[]).some((i) => String(i?.id ?? "") === "cc-payment"),
  );

  // Deuda abierta y reparto de lo ya pagado (FIFO).
  const openDebt = saleOrders
    .filter((o) => isCurrentAccount(o) && o.paid !== true && !isCancelled(o))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const sumOpen = openDebt.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const storedBalance = Math.max(0, Number(profileRes.data.balance) || 0);
  const balance = storedBalance > 0 ? storedBalance : sumOpen; // misma regla que el panel de clientes
  let covered = Math.max(0, sumOpen - balance);
  const allocation = new Map<string, number>();
  for (const o of openDebt) {
    const total = Number(o.total) || 0;
    const part = Math.min(total, covered);
    allocation.set(o.id, part);
    covered -= part;
  }

  const orders = saleOrders.map((o) => {
    const total = Number(o.total) || 0;
    let paymentStatus: PaymentStatus;
    let paidAmount = 0;
    if (isCancelled(o)) paymentStatus = "cancelado";
    else if (isCurrentAccount(o) && o.paid !== true) {
      paidAmount = allocation.get(o.id) ?? 0;
      paymentStatus = paidAmount <= 0 ? "pendiente" : paidAmount >= total ? "pagado" : "parcial";
    } else if (o.paid === true || ["paid", "completed"].includes(String(o.status ?? "").toLowerCase())) {
      paymentStatus = "pagado";
      paidAmount = total;
    } else paymentStatus = "pendiente";

    const items = Array.isArray(o.items) ? (o.items as any[]) : [];
    return {
      id: o.id,
      createdAt: o.created_at,
      total,
      paymentStatus,
      paidAmount,
      onAccount: isCurrentAccount(o),
      channel: String(o.delivery_type ?? o.order_type ?? "").toLowerCase(),
      items: items
        .filter((i) => i?.id !== "meta-customer")
        .map((i) => ({ name: String(i?.name ?? ""), quantity: Number(i?.quantity) || 1 })),
    };
  });

  const movements = [
    ...saleOrders
      .filter((o) => isCurrentAccount(o) && !isCancelled(o))
      .map((o) => ({ id: `o-${o.id}`, date: o.created_at, type: "cargo" as const, amount: Number(o.total) || 0, detail: `Pedido #${o.id.slice(0, 6).toUpperCase()}` })),
    ...(paymentsRes.data ?? []).map((p) => ({
      id: `p-${p.id}`,
      date: p.created_at as string,
      type: "pago" as const,
      amount: Number(p.amount) || 0,
      // notes guarda la referencia técnica del pago (GN:/MP:/SIM:); al cliente se le muestra el medio.
      detail: `Pago (${METHOD_LABEL[String(p.method)] ?? p.method})`,
    })),
    ...abonoOrders.map((o) => ({ id: `a-${o.id}`, date: o.created_at, type: "pago" as const, amount: Number(o.total) || 0, detail: `Pago (${o.payment_method ?? "efectivo"})` })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({
    profile: {
      fullName: profileRes.data.full_name ?? "",
      phone: profileRes.data.phone ?? "",
      phoneFormatted: formatPhone(profileRes.data.phone),
      address: profileRes.data.default_address ?? "",
    },
    balance,
    // El botón Pagar solo se habilita cuando Getnet tiene sus credenciales cargadas (o en modo demo fuera de producción).
    paymentsEnabled: getnetConfig().enabled || simulationEnabled(),
    orders,
    movements,
  });
}

/** Edición de nombre, teléfono y dirección. Solo estos campos; nunca rol, saldo ni is_customer. */
export async function PATCH(request: Request) {
  const auth = await requireCustomer();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: "El servidor no está configurado para guardar cambios." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, string> = {};

  if (body.fullName !== undefined) {
    const name = String(body.fullName).trim().slice(0, 120);
    if (!name) return NextResponse.json({ error: "El nombre no puede estar vacío." }, { status: 400 });
    patch.full_name = name;
  }
  if (body.address !== undefined) patch.default_address = String(body.address).trim().slice(0, 300);
  if (body.phone !== undefined) {
    const phone = normalizePhone(String(body.phone));
    if (!phone) return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
    patch.phone = phone;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });

  const service = createServiceRoleClient();
  if (patch.phone) {
    const { data: taken } = await service
      .from("profiles")
      .select("id")
      .eq("phone", patch.phone)
      .eq("is_customer", true)
      .neq("id", user.id)
      .limit(1)
      .maybeSingle();
    if (taken) return NextResponse.json({ error: "Ese teléfono ya pertenece a otra cuenta." }, { status: 409 });
  }

  const { error } = await service.from("profiles").update(patch).eq("id", user.id).eq("is_customer", true);
  if (error) {
    console.error("[cuenta] update", error.message);
    return NextResponse.json({ error: "No pudimos guardar los cambios." }, { status: error.code === "23505" ? 409 : 500 });
  }
  return NextResponse.json({ ok: true, phoneFormatted: patch.phone ? formatPhone(patch.phone) : undefined });
}
