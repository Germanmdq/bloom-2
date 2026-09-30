/**
 * Configuración inicial editable desde administración.
 * Los valores comerciales (puntos, beneficios, zonas) son un PUNTO DE PARTIDA:
 * la dueña los ajusta desde /veterinaria/admin sin tocar código.
 */
import { BUSINESS } from "../config/business";
import type { AutomationRule, Faq, RecommendationRule, ShippingZone, VetSettings } from "../types";

export const DEFAULT_AUTOMATIONS: AutomationRule[] = [
  {
    id: "turno_proximo",
    name: "Recordatorio de turno",
    description: "Avisa el día anterior al turno.",
    enabled: true,
    channel: "whatsapp_manual",
    days: 1,
    template: "Hola {cliente} 👋 Te recordamos el turno de {mascota} para {servicio} el {fecha} a las {hora} en {negocio}. Si no podés venir, avisanos por acá. ¡Gracias!",
  },
  {
    id: "seguimiento_pedido",
    name: "Seguimiento de pedido",
    description: "Mensaje al cambiar el estado del pedido (listo para retirar / en camino).",
    enabled: true,
    channel: "whatsapp_manual",
    template: "Hola {cliente}, tu pedido #{pedido} de {negocio} está {estado}. {link}",
  },
  {
    id: "carrito_abandonado",
    name: "Recuperación de carritos",
    description: "Detecta carritos sin finalizar y sugiere retomarlos.",
    enabled: true,
    channel: "whatsapp_manual",
    days: 1,
    template: "Hola {cliente}, vimos que dejaste productos en tu carrito de {negocio}. ¿Te ayudamos a terminar el pedido? {link}",
  },
  {
    id: "cumpleanos",
    name: "Cumpleaños de mascotas",
    description: "Saludo el día del cumpleaños, con beneficio opcional.",
    enabled: true,
    channel: "whatsapp_manual",
    days: 0,
    couponCode: "",
    template: "🎂 ¡Hoy es el cumpleaños de {mascota}! En {negocio} queremos celebrarlo con vos. {beneficio}",
  },
  {
    id: "bano",
    name: "Recordatorio de baño / peluquería",
    description: "Sugiere un nuevo turno cuando pasó el tiempo habitual desde el último baño.",
    enabled: true,
    channel: "whatsapp_manual",
    days: 30,
    template: "Hola {cliente}, es posible que a {mascota} le toque nuevamente el baño 🛁. ¿Querés reservar un turno? {link}",
  },
  {
    id: "desparasitacion",
    name: "Recordatorio de desparasitación",
    description: "Recuerda consultar por la próxima desparasitación (sin indicar dosis ni tratamientos).",
    enabled: false,
    channel: "whatsapp_manual",
    days: 90,
    template: "Hola {cliente}, recordá consultar con el veterinario por la próxima desparasitación de {mascota}. {link}",
  },
  {
    id: "recompra",
    name: "Recordatorio de recompra",
    description: "Productos de consumo frecuente comprados hace tiempo.",
    enabled: true,
    channel: "whatsapp_manual",
    days: 30,
    template: "Hola {cliente}, hace un tiempo llevaste {producto}. ¿Necesitás volver a comprarlo? {link}",
  },
  {
    id: "stock_bajo",
    name: "Avisos de stock bajo",
    description: "Alerta interna cuando un producto llega al stock mínimo.",
    enabled: true,
    channel: "interno",
    template: "⚠️ {producto} tiene solamente {stock} unidades.",
  },
  {
    id: "lista_espera",
    name: "Lista de espera",
    description: "Aviso cuando se libera un turno para quien lo estaba esperando.",
    enabled: true,
    channel: "whatsapp_manual",
    template: "Hola {cliente}, ¡se liberó un turno de {servicio} el {fecha} a las {hora}! ¿Lo querés? Respondé este mensaje para confirmarlo.",
  },
];

export const DEFAULT_SETTINGS: VetSettings = {
  business: BUSINESS,
  shipping: {
    pickupEnabled: true,
    deliveryEnabled: true,
    freeShippingFrom: null,
    estimatedDelivery: "Coordinamos el horario de entrega por WhatsApp.",
  },
  loyalty: {
    enabled: true,
    amountPerStep: 1000,
    pointsPerStep: 10,
    pointValue: 1,
    windowDays: 180,
    tiers: [
      { id: "nuevo", name: "Cliente nuevo", minOrders: 0, minSpent: 0, benefits: ["Bienvenida en la primera compra"], pointsMultiplier: 1 },
      { id: "frecuente", name: "Cliente frecuente", minOrders: 3, minSpent: 0, benefits: ["Prioridad en lista de espera"], pointsMultiplier: 1.25 },
      { id: "vip", name: "Cliente VIP", minOrders: 8, minSpent: 150000, benefits: ["Beneficios exclusivos", "Atención prioritaria"], pointsMultiplier: 1.5 },
    ],
    rewards: [
      { id: "r1", name: "$1.000 de descuento", points: 1000, kind: "descuento_fijo", value: 1000, active: true },
      { id: "r2", name: "Corte de uñas sin cargo", points: 1500, kind: "servicio", description: "Canjeable en tu próximo turno", active: true },
      { id: "r3", name: "10% en tu próxima compra", points: 2500, kind: "descuento_porcentaje", value: 10, active: true },
    ],
  },
  automations: DEFAULT_AUTOMATIONS,
  notifications: {
    enabled: true,
    kinds: {
      pedido_confirmado: true,
      pedido_listo: true,
      pedido_en_camino: true,
      turno_confirmado: true,
      turno_proximo: true,
      promociones: false,
      recordatorios: true,
    },
  },
  assistant: {
    enabled: true,
    greeting: "¡Hola! Soy el asistente de Vida de Perros 🐾 Te ayudo a encontrar productos, reservar turnos o contactarnos.",
  },
  lowStockDefault: 3,
  abandonedCartMinutes: 60,
};

/** Zonas de envío iniciales: precio `null` = "a coordinar" hasta que se definan. */
export const SEED_SHIPPING_ZONES: ShippingZone[] = [
  { id: "z1", name: "Zona 1", description: "Cercanías del local", price: null, freeFrom: null, maxKm: null, active: true, order: 1 },
  { id: "z2", name: "Zona 2", description: "Radio medio", price: null, freeFrom: null, maxKm: null, active: true, order: 2 },
  { id: "z3", name: "Zona 3", description: "Radio amplio", price: null, freeFrom: null, maxKm: null, active: true, order: 3 },
];

export const SEED_FAQS: Faq[] = [
  { id: "f1", order: 1, visible: true, question: "¿Hacen envíos?", answer: "Sí. Al finalizar tu compra elegís envío a domicilio y tu zona; el costo y el horario se confirman antes de despachar. También podés retirar en el local." },
  { id: "f2", order: 2, visible: true, question: "¿Cómo puedo reservar un turno?", answer: "Desde la sección Turnos elegís el servicio, tu mascota, el día y el horario. Te confirmamos por WhatsApp. Si no hay lugar, podés anotarte en la lista de espera." },
  { id: "f3", order: 3, visible: true, question: "¿Qué medios de pago aceptan?", answer: "Efectivo, transferencia, Mercado Pago y tarjeta en el local. Elegís el medio al confirmar el pedido." },
  { id: "f4", order: 4, visible: true, question: "¿Hacen baños?", answer: "Sí, hacemos baños con productos adecuados para cada tipo de pelo y piel. Reservá tu turno online." },
  { id: "f5", order: 5, visible: true, question: "¿Hacen peluquería?", answer: "Sí, peluquería canina con baño y corte según raza o a gusto, además de deslanado, higiene y corte de uñas." },
  { id: "f6", order: 6, visible: true, question: "¿Dónde están?", answer: "En la sección Ubicación vas a encontrar la dirección, el mapa y el botón «Cómo llegar»." },
  { id: "f7", order: 7, visible: true, question: "¿Cuánto demora un pedido?", answer: "Depende de la zona y de la disponibilidad. Te confirmamos el tiempo estimado por WhatsApp al recibir el pedido." },
  { id: "f8", order: 8, visible: true, question: "¿Puedo retirar en el local?", answer: "Sí. Elegí «Retiro en el local» al finalizar la compra y te avisamos cuando esté listo." },
  { id: "f9", order: 9, visible: true, question: "¿Puedo comprar medicamentos online?", answer: "Los productos de farmacia veterinaria se consultan con nuestro equipo antes de la venta, para indicarte la presentación y el uso adecuados para tu mascota." },
];

export const SEED_RECOMMENDATION_RULES: RecommendationRule[] = [
  { id: "rr1", name: "Ropa → paseo", whenCategoryIds: ["indumentaria"], whenTags: [], recommendCategoryIds: ["paseo", "juguetes"], recommendProductIds: [], label: "Combiná con", active: true },
  { id: "rr2", name: "Higiene → higiene y descanso", whenCategoryIds: ["higiene"], whenTags: ["shampoo", "cepillo"], recommendCategoryIds: ["higiene", "descanso"], recommendProductIds: [], label: "Completá el cuidado", active: true },
  { id: "rr3", name: "Paseo → comederos y juguetes", whenCategoryIds: ["paseo"], whenTags: [], recommendCategoryIds: ["comederos", "juguetes"], recommendProductIds: [], label: "Para el paseo", active: true },
  { id: "rr4", name: "Juguetes → juguetes y snacks", whenCategoryIds: ["juguetes"], whenTags: [], recommendCategoryIds: ["juguetes", "descanso"], recommendProductIds: [], label: "También te puede interesar", active: true },
  { id: "rr5", name: "Gatos → descanso e higiene", whenCategoryIds: [], whenTags: ["gato"], recommendCategoryIds: ["descanso", "higiene"], recommendProductIds: [], label: "Para tu gato", active: true },
];
