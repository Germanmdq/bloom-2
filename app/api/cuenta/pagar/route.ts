import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getMercadoPagoAccessToken } from "@/lib/mercadopago-access-token";
import { applyDebtPayment, buildCcReference, getDebtState, round2 } from "@/lib/cuenta-corriente";

export const dynamic = "force-dynamic";

/**
 * El cliente paga su saldo de cuenta corriente (total o parcial) con Mercado Pago.
 * El monto sale del servidor: se valida contra la deuda real y viaja en external_reference.
 * La acreditación y el movimiento los registra el webhook (/api/payments/webhook) tras comprobar
 * con la API de Mercado Pago que el monto acreditado coincide con el declarado.
 */
export async function POST(request: Request) {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: "El servidor no está configurado para cobrar." }, { status: 503 });
  }

  const svc = createServiceRoleClient();
  const { data: profile } = await svc.from("profiles").select("is_customer, full_name").eq("id", user.id).maybeSingle();
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

  const reference = buildCcReference(user.id, amount);
  const origin = new URL(request.url).origin;

  // Demo: solo fuera de producción, aplica el pago al instante sin llamar a Mercado Pago.
  const simulation =
    (process.env.PAYMENTS_SIMULATION === "true" || process.env.NEXT_PUBLIC_PAYMENTS_SIMULATION === "true") &&
    process.env.VERCEL_ENV !== "production";
  if (simulation) {
    const result = await applyDebtPayment(svc, user.id, amount, {
      method: "MERCADO_PAGO_SIMULADO",
      reference: `SIM:${reference}:${Date.now()}`,
      cashEntry: false,
    });
    if (result.status === "error") return NextResponse.json({ error: result.message }, { status: 500 });
    return NextResponse.json({ simulated: true, init_point: `${origin}/cuenta?pago=ok` });
  }

  const accessToken = getMercadoPagoAccessToken();
  if (!accessToken) return NextResponse.json({ error: "Mercado Pago no está configurado." }, { status: 500 });

  try {
    const preference = new Preference(new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } }));
    const result = await preference.create({
      body: {
        items: [{ id: "cc", title: "Pago de cuenta corriente - Bloom", quantity: 1, unit_price: amount, currency_id: "ARS" }],
        payer: { name: profile.full_name?.trim() || "Cliente Bloom" },
        back_urls: {
          success: `${origin}/cuenta?pago=ok`,
          failure: `${origin}/cuenta?pago=error`,
          pending: `${origin}/cuenta?pago=pendiente`,
        },
        auto_return: "approved",
        external_reference: reference,
        notification_url: `${origin}/api/payments/webhook`,
        statement_descriptor: "BLOOM CAFE",
        metadata: { type: "CC_PAYMENT", customer_id: user.id, amount },
      },
    });
    const initPoint = result.init_point ?? result.sandbox_init_point;
    if (!initPoint) return NextResponse.json({ error: "Mercado Pago no devolvió el enlace de pago." }, { status: 502 });
    return NextResponse.json({ init_point: initPoint });
  } catch (e) {
    console.error("[cuenta/pagar]", e);
    return NextResponse.json({ error: "No pudimos iniciar el pago. Intentá de nuevo." }, { status: 500 });
  }
}
