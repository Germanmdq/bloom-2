import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isAdminEmail } from "@/lib/auth/admin";

export async function GET(request: NextRequest) {
  try {
    const supabaseSession = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabaseSession.auth.getUser();
    if (userErr || !user?.email || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orderId = request.nextUrl.searchParams.get("order_id")?.trim();
    if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) {
      return NextResponse.json({ error: "order_id inválido" }, { status: 400 });
    }

    const svc = createServiceRoleClient();
    const { data, error } = await svc.from("orders").select("paid, order_type").eq("id", orderId).maybeSingle();

    if (error) {
      console.error("[pos-order-status]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      paid: Boolean(data.paid),
      order_type: data.order_type ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
