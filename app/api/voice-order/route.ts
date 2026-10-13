import { NextResponse } from "next/server";

type CatalogItem = { id: string; name: string; description?: string; price: number };
type VoiceTurn = { role: "user" | "assistant"; content: string };

const MAX_CATALOG_ITEMS = 120;

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function fallbackMatch(transcript: string, catalog: CatalogItem[]) {
  const request = normalize(transcript);
  const isQuestion = /\?|^(que|cual|cuanto|como|tenes|hay|me recomend)/.test(request);
  if (isQuestion) return undefined;
  const asksForCoffeeWithMilk = /cafe/.test(request) && /leche/.test(request);

  if (asksForCoffeeWithMilk) {
    const milkCoffee = catalog.find((item) => {
      const details = normalize(`${item.name} ${item.description || ""}`);
      return /capuchino|cappuccino|latte|cortado|cafe con leche/.test(details)
        || (details.includes("cafe") && details.includes("leche"));
    });
    if (milkCoffee) return milkCoffee;
  }

  return catalog.find((item) => {
    const name = normalize(item.name);
    return name.length >= 4 && request.includes(name);
  });
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
        reasoning_effort: "none",
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Sos Bloom, el asistente conversacional de una cafetería argentina. Podés responder preguntas breves sobre el menú, precios, ingredientes, opciones y recomendaciones usando exclusivamente el catálogo y el historial de esta conversación. También interpretás pedidos naturales: entendé frases cotidianas, diminutivos y referencias al contexto como "café con leche", "unas medialunas", "lo de siempre" o "uno de esos". Cuando sea una pregunta, respondé claro y amable, y devolvé items []. Cuando el cliente pida productos de forma clara, devolvé esos productos con la cantidad solicitada. Si una referencia no tiene contexto suficiente o puede significar dos productos distintos, no adivines: preguntá brevemente cuál prefiere y devolvé items []. Nunca inventes productos, precios ni IDs, ni digas que un pedido ya fue agregado: la app va a pedir confirmación antes. Respondé JSON estricto: {"reply":"frase breve en español rioplatense","items":[{"id":"id exacto del catálogo","quantity":1}]}.`,
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
    const parsed = typeof raw === "string" ? JSON.parse(raw) : null;
    const catalogById = new Map(catalog.map((item: CatalogItem) => [item.id, item]));
    const items = Array.isArray(parsed?.items)
      ? parsed.items
          .map((item: { id?: unknown; quantity?: unknown }) => ({
            id: String(item?.id ?? ""),
            quantity: Math.min(20, Math.max(1, Math.floor(Number(item?.quantity) || 1))),
          }))
          .filter((item: { id: string; quantity: number }) => catalogById.has(item.id))
      : [];

    const suggestedItem = items.length ? null : fallbackMatch(transcript, catalog);
    const resolvedItems = suggestedItem ? [{ id: suggestedItem.id, quantity: 1 }] : items;

    return NextResponse.json({
      reply: suggestedItem
        ? `Agregué ${suggestedItem.name} a tu pedido.`
        : typeof parsed?.reply === "string" ? parsed.reply.slice(0, 320) : "Listo, revisá tu pedido.",
      items: resolvedItems,
    });
  } catch (error) {
    console.error("[voice-order]", error);
    return NextResponse.json({ error: "No pude procesar el pedido por voz." }, { status: 500 });
  }
}
