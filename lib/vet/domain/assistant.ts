/**
 * Asistente de orientación (sin IA por defecto).
 *
 * Detecta la intención del mensaje y orienta hacia productos, servicios,
 * turnos, ubicación, horarios o contacto. NUNCA da diagnósticos: ante
 * consultas médicas deriva a un profesional.
 *
 * Para conectar un modelo de IA más adelante, se implementa `AssistantProvider`
 * en el servidor (`app/api/veterinaria/assistant/route.ts`) y se mantiene
 * `detectMedicalConcern` como guardia previa.
 */
import { normalizeText } from "./format";

export type AssistantIntent =
  | "saludo"
  | "producto"
  | "servicio"
  | "turno"
  | "ubicacion"
  | "horario"
  | "contacto"
  | "envio"
  | "pago"
  | "medico"
  | "urgencia"
  | "desconocido";

export interface AssistantAction {
  label: string;
  href: string;
  kind?: "whatsapp" | "link";
}

export interface AssistantReply {
  intent: AssistantIntent;
  text: string;
  actions: AssistantAction[];
  /** Término sugerido para buscar productos. */
  searchQuery?: string;
}

export interface AssistantProvider {
  reply(message: string, history: { role: "user" | "assistant"; content: string }[]): Promise<AssistantReply>;
}

const URGENT = ["convulsion", "convulsiona", "no respira", "respira mal", "sangra mucho", "sangrado", "envenen", "veneno", "atropell", "golpe fuerte", "desmay", "inconsciente", "no reacciona", "hinchado el abdomen", "abdomen hinchado", "intoxic", "golpe de calor"];
const MEDICAL = ["vomit", "diarrea", "fiebre", "tos", "estornud", "picazon", "rasca mucho", "herida", "lastim", "cojea", "renguea", "no come", "no quiere comer", "decaido", "sintoma", "enfermo", "enferma", "dolor", "infeccion", "dosis", "cuanto le doy", "que le doy", "medicamento", "remedio", "antibiotico", "diagnostic", "tratamiento", "pastilla", "le sale", "bulto", "caida de pelo", "orina", "sangre"];

export function detectMedicalConcern(message: string): "urgencia" | "medico" | null {
  const t = normalizeText(message);
  if (URGENT.some((k) => t.includes(k))) return "urgencia";
  if (MEDICAL.some((k) => t.includes(k))) return "medico";
  return null;
}

const INTENTS: { intent: AssistantIntent; keys: string[] }[] = [
  { intent: "turno", keys: ["turno", "reserv", "agenda", "cita", "sacar hora", "disponibilidad"] },
  { intent: "servicio", keys: ["bano", "banar", "peluqueria", "corte", "unas", "deslanado", "higiene", "consulta", "vacuna", "veterinari", "servicio"] },
  { intent: "ubicacion", keys: ["donde", "direccion", "ubicacion", "como llego", "mapa", "llegar", "local"] },
  { intent: "horario", keys: ["horario", "hora abren", "abren", "cierran", "abierto", "atienden"] },
  { intent: "envio", keys: ["envio", "envian", "delivery", "domicilio", "retiro", "retirar", "mandan"] },
  { intent: "pago", keys: ["pago", "pagar", "tarjeta", "transferencia", "mercado pago", "efectivo", "cuotas"] },
  { intent: "contacto", keys: ["whatsapp", "telefono", "contacto", "llamar", "hablar con", "instagram", "persona"] },
  { intent: "saludo", keys: ["hola", "buenas", "buen dia", "buenas tardes", "buenas noches"] },
];

const PRODUCT_HINTS = ["comprar", "tienen", "venden", "precio", "cuanto sale", "cuanto cuesta", "busco", "necesito", "quiero", "producto", "stock"];

export function ruleBasedReply(message: string, ctx: { businessName: string; whatsappHref: string; base: string; hoursText: string; hasAddress: boolean }): AssistantReply {
  const concern = detectMedicalConcern(message);
  const wa: AssistantAction = { label: "Escribir por WhatsApp", href: ctx.whatsappHref, kind: "whatsapp" };
  if (concern === "urgencia") {
    return {
      intent: "urgencia",
      text: "Esto puede ser una urgencia. No puedo evaluar la salud de tu mascota: por favor comunicate de inmediato con un veterinario o una guardia veterinaria. Si querés, escribinos ahora por WhatsApp.",
      actions: [wa],
    };
  }
  if (concern === "medico") {
    return {
      intent: "medico",
      text: "No puedo dar diagnósticos ni indicar tratamientos o dosis: eso lo tiene que evaluar un veterinario. Te recomiendo reservar una consulta o escribirnos para orientarte.",
      actions: [{ label: "Reservar consulta veterinaria", href: `${ctx.base}/turnos?servicio=consulta` }, wa],
    };
  }

  const t = normalizeText(message);
  const found = INTENTS.find((i) => i.keys.some((k) => t.includes(k)));
  switch (found?.intent) {
    case "turno":
      return { intent: "turno", text: "¡Claro! Podés reservar un turno eligiendo el servicio, el día y el horario. Si no hay lugar, te anotamos en la lista de espera.", actions: [{ label: "Reservar turno", href: `${ctx.base}/turnos` }, wa] };
    case "servicio":
      return { intent: "servicio", text: "Hacemos consulta veterinaria, baño, peluquería canina, corte de uñas, deslanado e higiene. ¿Querés ver los servicios o reservar directamente?", actions: [{ label: "Ver servicios", href: `${ctx.base}/servicios` }, { label: "Reservar turno", href: `${ctx.base}/turnos` }] };
    case "ubicacion":
      return { intent: "ubicacion", text: ctx.hasAddress ? "Te dejo la ubicación con el mapa y el botón para llegar." : "Estamos terminando de cargar la dirección en la app. Escribinos por WhatsApp y te la pasamos.", actions: [{ label: "Ver ubicación", href: `${ctx.base}/ubicacion` }, wa] };
    case "horario":
      return { intent: "horario", text: ctx.hoursText, actions: [{ label: "Ver ubicación y horarios", href: `${ctx.base}/ubicacion` }] };
    case "envio":
      return { intent: "envio", text: "Podés elegir envío a domicilio o retiro en el local al finalizar la compra. El costo depende de la zona.", actions: [{ label: "Ver preguntas frecuentes", href: `${ctx.base}/preguntas-frecuentes` }, { label: "Ir a la tienda", href: `${ctx.base}/tienda` }] };
    case "pago":
      return { intent: "pago", text: "Aceptamos efectivo, transferencia, Mercado Pago y tarjeta en el local. Elegís el medio al confirmar el pedido.", actions: [{ label: "Ir a la tienda", href: `${ctx.base}/tienda` }] };
    case "contacto":
      return { intent: "contacto", text: `Podés hablar con el equipo de ${ctx.businessName} por WhatsApp.`, actions: [wa] };
    case "saludo":
      if (!PRODUCT_HINTS.some((k) => t.includes(k))) {
        return { intent: "saludo", text: `¡Hola! ¿En qué te ayudo? Puedo mostrarte productos, servicios, turnos, la ubicación o ponerte en contacto con ${ctx.businessName}.`, actions: [{ label: "Tienda", href: `${ctx.base}/tienda` }, { label: "Turnos", href: `${ctx.base}/turnos` }, wa] };
      }
  }

  // Por defecto: tratarlo como búsqueda de productos.
  const query = t
    .split(" ")
    .filter((w) => w.length > 2 && !["hola", "quiero", "necesito", "busco", "tienen", "venden", "comprar", "precio", "cuanto", "sale", "cuesta", "para", "una", "uno", "mas", "que", "del", "los", "las", "hay"].includes(w))
    .join(" ");
  if (query) {
    return { intent: "producto", text: `Busqué «${query}» en la tienda. Si no encontrás lo que necesitás, escribinos y lo consultamos.`, actions: [{ label: `Ver resultados de «${query}»`, href: `${ctx.base}/buscar?q=${encodeURIComponent(query)}` }, wa], searchQuery: query };
  }
  return { intent: "desconocido", text: "No estoy seguro de haber entendido. Puedo ayudarte con productos, servicios, turnos, ubicación, horarios o contacto.", actions: [{ label: "Tienda", href: `${ctx.base}/tienda` }, { label: "Turnos", href: `${ctx.base}/turnos` }, wa] };
}
