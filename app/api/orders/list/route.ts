import { NextResponse } from "next/server";
import { requireDashboardAdmin } from "@/lib/dashboard/require-admin-api";
import { createClient } from "@/lib/supabase/server";

/**
 * Lista pedidos para el dashboard.
 * Identidad: sesión admin (mismo criterio que /dashboard). Datos: obligatorio service role (RLS no aplica a anon aquí).
 */
export async function GET(req: Request) {
  try {
    const adminUser = await requireDashboardAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = await createClient();
    const requestedDays = Number(new URL(req.url).searchParams.get("days") ?? 90);
    const historyDays = Number.isFinite(requestedDays)
      ? Math.min(365, Math.max(1, Math.round(requestedDays)))
      : 90;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - historyDays);

    const pageSize = 1000;
    const maxRows = 20000;
    const data: any[] = [];

    for (let offset = 0; offset < maxRows; offset += pageSize) {
      const { data: page, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", fromDate.toISOString())
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error("Supabase API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      data.push(...(page ?? []));
      if (!page || page.length < pageSize) break;
    }

    console.log("[orders/list] total rows fetched:", data?.length);

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
