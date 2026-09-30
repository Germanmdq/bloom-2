/**
 * POST /api/veterinaria/assistant
 *
 * Punto de conexión para un modelo de IA. Hoy responde con el motor de
 * reglas (sin costo ni credenciales). Para usar IA, definir
 * VET_ASSISTANT_PROVIDER y su clave en el servidor e implementar
 * `aiReply` (el proyecto ya incluye SDKs de Groq y Google Generative AI).
 *
 * Guardia obligatoria: las consultas médicas se derivan a un profesional
 * ANTES de llegar a cualquier modelo.
 */
import { detectMedicalConcern, ruleBasedReply, type AssistantReply } from "@/lib/vet/domain/assistant";
import { BUSINESS } from "@/lib/vet/config/business";
import { vetPath } from "@/lib/vet/config/integrations";
import { waLink, WA_MESSAGES } from "@/lib/vet/domain/whatsapp";

const SYSTEM_PROMPT = `Sos el asistente de ${BUSINESS.name}, veterinaria, peluquería canina y pet shop.
Orientás a los clientes hacia productos, servicios, turnos, ubicación, horarios y contacto.
NUNCA das diagnósticos, dosis ni tratamientos: ante cualquier consulta de salud recomendás consultar con un veterinario y ofrecés reservar una consulta.
Respondés en español rioplatense, breve y amable. No inventás precios, stock, dirección ni horarios.`;

async function aiReply(_message: string): Promise<AssistantReply | null> {
  const provider = process.env.VET_ASSISTANT_PROVIDER;
  if (!provider) return null;
  // Conectar acá el proveedor elegido usando SYSTEM_PROMPT (clave solo en el servidor).
  void SYSTEM_PROMPT;
  return null;
}

export async function POST(req: Request) {
  let message = "";
  try {
    message = String((await req.json()).message ?? "").slice(0, 1000);
  } catch {
    return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const ctx = {
    businessName: BUSINESS.name,
    whatsappHref: waLink(BUSINESS.whatsapp, WA_MESSAGES.help()),
    base: vetPath(),
    hoursText: BUSINESS.hoursConfirmed ? "Mirá nuestros horarios en la sección Ubicación." : "Estamos confirmando los horarios de atención. Escribinos por WhatsApp y te respondemos.",
    hasAddress: Boolean(BUSINESS.address.street),
  };
  if (!detectMedicalConcern(message)) {
    const ai = await aiReply(message).catch(() => null);
    if (ai) return Response.json(ai);
  }
  return Response.json(ruleBasedReply(message, ctx));
}
