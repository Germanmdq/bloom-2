import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isAdminEmail } from "@/lib/auth/admin";

/**
 * Lista pedidos para el dashboard.
 * Identidad: sesión admin (mismo criterio que /dashboard). Datos: obligatorio service role (RLS no aplica a anon aquí).
 */
export async function GET(req: Request) {
  console.log(
    "[orders/list] SERVICE_ROLE_KEY present:",
    !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    "length:",
    process.env.SUPABASE_SERVICE_ROLE_KEY?.length
  );
  try {
    const supabaseSession = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabaseSession.auth.getUser();
    if (userErr || !user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
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
