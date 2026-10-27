import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { applyDebtPayment, getDebtState, round2 } from "@/lib/cuenta-corriente";
import { buildGetnetCustomer, buildOrderId, createPaymentIntent, getnetConfig, simulationEnabled } from "@/lib/getnet";

export const dynamic = "force-dynamic";

/**
 * El cliente paga su saldo de cuenta corriente (total o parcial) con Getnet (Web Checkout, redirect).
 * El monto sale del servidor: se valida contra la deuda real y viaja en el order_id del payment intent.
 * La acreditación y el movimiento los registra el webhook (/api/payments/getnet/webhook) tras consultar
 * a Getnet que el pago está aprobado y por qué monto.
 */
export async function POST(request: Request) {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const getnet = getnetConfig();
  if (!getnet.enabled && !simulationEnabled()) {
    return NextResponse.json({ error: "El pago online todavía no está disponible. Podés abonar tu saldo en el local." }, { status: 503 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: "El servidor no está configurado para cobrar." }, { status: 503 });
  }

  const svc = createServiceRoleClient();
  const { data: profile } = await svc.from("profiles").select("is_customer, full_name, phone, cuit").eq("id", user.id).maybeSingle();
  if (!profile?.is_customer) return NextResponse.json({ error: "Solo para clientes." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const debt = await getDebtState(svc, user.id);
  if (debt.effective <= 0) return NextResponse.json({ error: "No tenés saldo pendiente." }, { status: 400 });

  const amount = body.mode === "parcial" ? round2(Number(body.amount)) : debt.effective;
  if (!Number.isFinite(amount) || amount < 1) {
    return NextResponse.json({ error: "Ingresá un monto de al menos $1." }, { status: 400 });
  }
  if (amount > debt.effective + 0.001) {
    return NextResponse.json({ error: "El monto no puede superar tu saldo pendiente." }, { status: 400 });
  }
  const cents = Math.round(amount * 100);
  const origin = new URL(request.url).origin;

  if (!getnet.enabled) {
    const result = await applyDebtPayment(svc, user.id, amount, {
      method: "SIMULADO",
      reference: `SIM:${user.id}:${cents}:${Date.now()}`,
      cashEntry: false,
    });
    if (result.status === "error") return NextResponse.json({ error: result.message }, { status: 500 });
    return NextResponse.json({ simulated: true, redirect_url: `${origin}/cuenta?pago=ok` });
  }

  try {
    const intent = await createPaymentIntent({
      orderId: buildOrderId(cents),
      cents,
      customer: buildGetnetCustomer({
        customerId: user.id,
        fullName: profile.full_name?.trim() || "Cliente Bloom",
        phone: profile.phone,
        cuit: profile.cuit,
      }),
      successUrl: `${origin}/cuenta?pago=ok`,
      errorUrl: `${origin}/cuenta?pago=error`,
    });
    return NextResponse.json({ redirect_url: intent.redirectUrl });
  } catch (e) {
    console.error("[cuenta/pagar]", e);
    return NextResponse.json({ error: "No pudimos iniciar el pago. Intentá de nuevo." }, { status: 502 });
  }
}
