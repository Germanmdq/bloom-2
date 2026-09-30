/**
 * GET /api/veterinaria/availability — horarios ocupados de los próximos días
 * (modo supabase). Devuelve solo servicio/fecha/hora/duración: ningún dato personal.
 */
import { INTEGRATIONS } from "@/lib/vet/config/integrations";
import { adminRepo, badRequest } from "@/lib/vet/server/supabase-admin";

export async function GET() {
  if (INTEGRATIONS.dataSource !== "supabase") return badRequest("Modo demo", 409);
  const { client } = adminRepo();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await client
    .from("vet_appointments")
    .select("id, service_id, date, time, duration_min, status")
    .gte("date", today)
    .in("status", ["pendiente", "confirmado"])
    .limit(2000);
  if (error) return badRequest(error.message, 500);
  const busy = (data ?? []).map((a, i) => ({
    id: `busy-${i}`,
    serviceId: a.service_id,
    date: a.date,
    time: a.time,
    durationMin: a.duration_min,
    status: a.status,
    customerName: "",
    phone: "",
    price: null,
    source: "web",
    createdAt: "",
    updatedAt: "",
  }));
  return Response.json({ busy }, { headers: { "Cache-Control": "no-store" } });
}
