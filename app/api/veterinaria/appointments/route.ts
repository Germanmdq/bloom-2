/**
 * POST /api/veterinaria/appointments — reserva un turno (modo supabase).
 * Verifica en el servidor que el horario siga libre antes de guardarlo.
 */
import { INTEGRATIONS } from "@/lib/vet/config/integrations";
import { getSlots } from "@/lib/vet/domain/availability";
import type { Appointment } from "@/lib/vet/types";
import { adminRepo, badRequest, isValidName, isValidPhone, upsertCustomerByPhone } from "@/lib/vet/server/supabase-admin";

export async function POST(req: Request) {
  if (INTEGRATIONS.dataSource !== "supabase") return badRequest("En modo demo los turnos se procesan en el navegador.", 409);
  let body: { serviceId?: string; date?: string; time?: string; customer?: { name?: string; phone?: string; email?: string; marketingOptIn?: boolean }; petId?: string; petName?: string; notes?: string; comboId?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest("Solicitud inválida");
  }
  if (!body.serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(body.date ?? "") || !/^\d{2}:\d{2}$/.test(body.time ?? "")) return badRequest("Elegí servicio, día y horario");
  if (!isValidName(body.customer?.name) || !isValidPhone(body.customer?.phone)) return badRequest("Completá nombre y teléfono");

  const { repo } = adminRepo();
  const [services, appointments, blocked, combos] = await Promise.all([repo.list("services"), repo.list("appointments"), repo.list("blockedSlots"), repo.list("combos")]);
  const service = services.find((s) => s.id === body.serviceId && s.visible);
  if (!service) return badRequest("Servicio no disponible", 404);
  const slot = getSlots(service, body.date!, appointments, blocked).find((s) => s.time === body.time);
  if (!slot?.available) return badRequest("Ese horario ya no está disponible. Elegí otro o sumate a la lista de espera.", 409);

  const customer = await upsertCustomerByPhone(repo, { name: body.customer!.name!.trim(), phone: body.customer!.phone!.trim(), email: body.customer?.email, marketingOptIn: body.customer?.marketingOptIn });
  const combo = combos.find((c) => c.id === body.comboId && c.active);
  const now = new Date().toISOString();
  const appointment: Appointment = {
    id: `a_${crypto.randomUUID()}`,
    serviceId: service.id,
    comboId: combo?.id,
    customerId: customer.id,
    petId: body.petId,
    customerName: customer.name,
    phone: customer.phone,
    petName: body.petName?.slice(0, 60),
    date: body.date!,
    time: body.time!,
    durationMin: service.durationMin,
    price: combo?.price ?? service.price,
    status: "pendiente",
    notes: body.notes?.slice(0, 500),
    source: "web",
    createdAt: now,
    updatedAt: now,
  };
  await repo.upsert("appointments", appointment);
  return Response.json({ appointment }, { status: 201 });
}
