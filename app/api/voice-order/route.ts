import { NextResponse } from "next/server";

type CatalogItem = { id: string; name: string; description?: string; price: number };
type VoiceTurn = { role: "user" | "assistant"; content: string };

const MAX_CATALOG_ITEMS = 120;
const DISAMBIGUATING_TERMS = [
  "pollo", "jamon", "queso", "carne", "cerdo", "pescado", "atun",
  "vegetariano", "vegano", "aquarius", "coca", "sprite", "fanta", "pepsi",
  "limon", "naranja", "chocolate", "vainilla",
];
const QUANTITY_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
};
const REQUEST_STOP_WORDS = new Set([
  "a", "al", "con", "de", "del", "el", "la", "las", "los", "me", "mi", "para", "por",
  "quiero", "quisiera", "dame", "agrega", "agregame", "sumame", "un", "una", "uno", "dos",
  "tres", "cuatro", "cinco", "seis", "siete", "o", "y",
]);

const isQuestion = (value: string) =>
  /[?¿]/.test(value)
  || /^\s*(que|qué|cual|cuál|cuanto|cuánto|como|cómo|tenes|tenés|hay|me recomend[aá]s|podes|podés)\b/i.test(value);

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const words = (value: string) => normalize(value).split(" ").filter(Boolean).map((word) =>
  word.endsWith("s") && word.length > 3 ? word.slice(0, -1) : word,
);

function requestedQuantity(transcript: string) {
  const numeric = normalize(transcript).match(/\b(\d{1,2})\b/);
  if (numeric) return Math.min(20, Math.max(1, Number(numeric[1])));
  return words(transcript).map((word) => QUANTITY_WORDS[word]).find(Boolean);
}

function requestedDiscriminators(transcript: string) {
  const requestWords = new Set(words(transcript));
  return DISAMBIGUATING_TERMS.filter((term) => requestWords.has(term));
}

function itemHasTerms(item: CatalogItem, terms: string[]) {
  const itemWords = new Set(words(`${item.name} ${item.description || ""}`));
  return terms.every((term) => itemWords.has(term));
}

function findExplicitCatalogItem(transcript: string, catalog: CatalogItem[]) {
  const requestWords = words(transcript);
  const discriminators = requestedDiscriminators(transcript);
  if (!discriminators.length) return undefined;

  const ranked = catalog
    .filter((item) => itemHasTerms(item, discriminators))
    .map((item) => {
      const nameWords = new Set(words(item.name));
      const detailWords = new Set(words(item.description || ""));
      const score = requestWords.reduce((total, word) =>
        total + (nameWords.has(word) ? 3 : detailWords.has(word) ? 1 : 0), 0);
      return { item, score };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score ? ranked[0].item : undefined;
}

function fallbackMatch(transcript: string, catalog: CatalogItem[]) {
  const request = normalize(transcript);
  if (isQuestion(transcript)) return undefined;
  const asksForCoffeeWithMilk = /cafe/.test(request) && /leche/.test(request);

  if (asksForCoffeeWithMilk) {
    const milkCoffee = catalog.find((item) => {
      const details = normalize(`${item.name} ${item.description || ""}`);
      return /capuchino|cappuccino|latte|cortado|cafe con leche/.test(details)
        || (details.includes("cafe") && details.includes("leche"));
    });
    if (milkCoffee) return milkCoffee;
  }

  const exactName = catalog.find((item) => {
    const name = normalize(item.name);
    return name.length >= 4 && request.includes(name);
  });
  if (exactName) return exactName;

  // Si el modelo no pudo responder, resolvemos nombres parciales sin adivinar.
  // Esto cubre pedidos naturales como "dos milanesas de pollo" o "un Aquarius".
  const requestTerms = words(transcript).filter((word) => !REQUEST_STOP_WORDS.has(word));
  if (!requestTerms.length) return undefined;
  const ranked = catalog
    .map((item) => {
      const nameTerms = new Set(words(item.name));
      const descriptionTerms = new Set(words(item.description || ""));
      const score = requestTerms.reduce((total, term) =>
        total + (nameTerms.has(term) ? 4 : descriptionTerms.has(term) ? 2 : 0), 0);
      return { item, score };
    })
    .sort((a, b) => b.score - a.score);
  const [best, second] = ranked;
  // Un único término fuerte (marca o nombre) alcanza; ante empate pedimos aclaración.
  if (!best || best.score < 4 || best.score === second?.score) return undefined;
  return best.item;
}

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "El asistente de voz todavía no está configurado." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";
    const history: VoiceTurn[] = Array.isArray(body?.history)
      ? body.history
          .slice(-16)
          .filter((turn: unknown): turn is VoiceTurn => {
            const candidate = turn as VoiceTurn;
            return (candidate?.role === "user" || candidate?.role === "assistant") && typeof candidate?.content === "string";
          })
          .map((turn: VoiceTurn) => ({ role: turn.role, content: turn.content.slice(0, 700) }))
      : [];
    const catalog: CatalogItem[] = Array.isArray(body?.catalog)
      ? body.catalog
          .slice(0, MAX_CATALOG_ITEMS)
          .filter((item: unknown): item is CatalogItem => {
            const candidate = item as CatalogItem;
            return Boolean(candidate?.id && candidate?.name && Number.isFinite(Number(candidate?.price)));
          })
          .map((item: CatalogItem) => ({
            id: String(item.id),
            name: String(item.name).slice(0, 120),
            description: typeof item.description === "string" ? item.description.slice(0, 240) : "",
            price: Number(item.price),
          }))
      : [];

    if (!transcript || !catalog.length) {
      return NextResponse.json({ error: "No pude leer el pedido o el menú." }, { status: 400 });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        // Qwen puede razonar sin mostrar su cadena interna. En pedidos ambiguos
        // privilegia el contexto de la conversación antes de elegir un producto.
        reasoning_effort: "low",
        reasoning_format: "hidden",
        temperature: 0.35,
        max_completion_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: `Instrucciones internas de Bloom: sos un asistente conversacional de una cafetería argentina. Respondé preguntas sobre el menú, precios, ingredientes, opciones y recomendaciones usando sólo el catálogo y el historial. Entendé lenguaje cotidiano, faltas leves, diminutivos y sinónimos: "mila" significa milanesa y "Aqua" puede referirse a Aquarius si existe en el catálogo. Para referencias como "otro", "uno de esos", "al final agregá", "lo mismo" o "coso", resolvelas con el último producto inequívoco del historial; si hay dos o más candidatos, preguntá cuál es y devolvé items []. Conservá siempre los productos ya mencionados en la conversación: no confirmes ni cierres un pedido por tu cuenta.

REGLA CRÍTICA: nunca reemplaces una característica explícita. Pollo no es jamón ni queso; Aquarius no es otra gaseosa; una marca, sabor, carne o ingrediente mencionado debe coincidir en el producto o su descripción. Si no existe la opción exacta, decilo y no devuelvas items. Cuando sea una pregunta, devolvé items []. Para un pedido claro, devolvé todos los productos solicitados con su cantidad. Nunca inventes productos, precios ni IDs, ni digas que un pedido ya fue agregado: la app pide confirmación después.

Respondé solamente JSON estricto: {"reply":"frase breve en español rioplatense","items":[{"id":"id exacto del catálogo","quantity":1}]}.`,
          },
          ...history.map((turn) => ({ role: turn.role, content: turn.content })),
          {
            role: "user",
            content: JSON.stringify({ pedido: transcript, catalogo: catalog }),
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("[voice-order] Groq error", response.status, detail);
      return NextResponse.json({ error: "El asistente no pudo responder ahora." }, { status: 502 });
    }

    const payload = await response.json();
    const raw = payload?.choices?.[0]?.message?.content;
    let parsed: { reply?: unknown; items?: unknown } | null = null;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw) as { reply?: unknown; items?: unknown };
      } catch {
        // Una respuesta malformada no debe cortar la conversación: el fallback
        // de catálogo de abajo puede todavía resolver el pedido.
        parsed = null;
      }
    }
    const catalogById = new Map(catalog.map((item: CatalogItem) => [item.id, item]));
    const items = Array.isArray(parsed?.items)
      ? parsed.items
          .map((item: { id?: unknown; quantity?: unknown }) => ({
            id: String(item?.id ?? ""),
            quantity: Math.min(20, Math.max(1, Math.floor(Number(item?.quantity) || 1))),
          }))
          .filter((item: { id: string; quantity: number }) => catalogById.has(item.id))
      : [];

    const explicitCatalogItem = findExplicitCatalogItem(transcript, catalog);
    const modelItem = items.length === 1 ? catalogById.get(items[0].id) : undefined;
    const discriminators = requestedDiscriminators(transcript);
    const modelSubstitutedAnIngredient = Boolean(
      modelItem && discriminators.length && !itemHasTerms(modelItem, discriminators),
    );
    const requestedItems = isQuestion(transcript) ? [] : items;
    const correctedItems = !isQuestion(transcript) && explicitCatalogItem && items.length <= 1
      ? [{ id: explicitCatalogItem.id, quantity: requestedQuantity(transcript) || items[0]?.quantity || 1 }]
      : modelSubstitutedAnIngredient
        ? []
        : requestedItems;
    const suggestedItem = correctedItems.length ? null : fallbackMatch(transcript, catalog);
    const resolvedItems = suggestedItem ? [{ id: suggestedItem.id, quantity: requestedQuantity(transcript) || 1 }] : correctedItems;
    const reply = explicitCatalogItem && resolvedItems.some((item: { id: string; quantity: number }) => item.id === explicitCatalogItem.id)
      ? `Entendí: ${resolvedItems[0].quantity > 1 ? `${resolvedItems[0].quantity} ` : ""}${explicitCatalogItem.name}.`
      : modelSubstitutedAnIngredient
        ? "No encontré esa opción exacta en el menú. ¿Querés que te diga las alternativas disponibles?"
        : typeof parsed?.reply === "string" ? parsed.reply.slice(0, 320) : "Listo, revisá tu pedido.";

    return NextResponse.json({
      reply: suggestedItem ? `Entendí: ${suggestedItem.name}.` : reply,
      items: resolvedItems,
    });
  } catch (error) {
    console.error("[voice-order]", error);
    return NextResponse.json({ error: "No pude procesar el pedido por voz." }, { status: 500 });
  }
}
