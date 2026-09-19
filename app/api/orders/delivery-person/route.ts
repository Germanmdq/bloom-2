import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Asignar repartidor (1–5) a un pedido delivery (staff; RLS orders_staff_update). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { orderId?: string; delivery_person_id?: number | null };
    const orderId = body.orderId?.trim();
    if (!orderId) {
      return NextResponse.json({ error: "orderId requerido" }, { status: 400 });
    }
    const raw = body.delivery_person_id;
    if (raw !== null && raw !== undefined) {
      if (!Number.isInteger(raw) || raw < 1 || raw > 5) {
        return NextResponse.json({ error: "delivery_person_id debe ser 1–5 o null" }, { status: 400 });
      }
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { error } = await supabase
      .from("orders")
      .update({ delivery_person_id: raw ?? null })
      .eq("id", orderId);

    if (error) {
      console.error("[orders/delivery-person]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
