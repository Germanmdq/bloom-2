/** POST /api/veterinaria/waitlist — suma a la lista de espera (modo supabase). */
import { INTEGRATIONS } from "@/lib/vet/config/integrations";
import type { WaitlistEntry } from "@/lib/vet/types";
import { adminRepo, badRequest, isValidName, isValidPhone } from "@/lib/vet/server/supabase-admin";

export async function POST(req: Request) {
  if (INTEGRATIONS.dataSource !== "supabase") return badRequest("En modo demo la lista de espera se guarda en el navegador.", 409);
  let body: Partial<WaitlistEntry>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Solicitud inválida");
  }
  if (!isValidName(body.name) || !isValidPhone(body.phone) || !body.serviceId) return badRequest("Completá nombre, teléfono y servicio");
  const entry: WaitlistEntry = {
    id: `w_${crypto.randomUUID()}`,
    name: body.name.trim(),
    phone: body.phone.trim(),
    petName: body.petName?.slice(0, 60),
    serviceId: body.serviceId,
    preferredDate: /^\d{4}-\d{2}-\d{2}$/.test(body.preferredDate ?? "") ? body.preferredDate : undefined,
    preferredTime: /^\d{2}:\d{2}$/.test(body.preferredTime ?? "") ? body.preferredTime : undefined,
    notes: body.notes?.slice(0, 500),
    status: "esperando",
    createdAt: new Date().toISOString(),
  };
  const { repo } = adminRepo();
  await repo.upsert("waitlist", entry);
  return Response.json({ entry }, { status: 201 });
}
