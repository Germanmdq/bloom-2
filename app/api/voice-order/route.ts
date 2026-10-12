import { NextResponse } from "next/server";

type CatalogItem = { id: string; name: string; price: number };

const MAX_CATALOG_ITEMS = 120;

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
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Sos Bloom, asistente de pedidos de una cafetería argentina. Interpretá el pedido usando exclusivamente el catálogo. Respondé JSON estricto: {"reply":"frase breve en español rioplatense","items":[{"id":"id exacto del catálogo","quantity":1}]}. Si falta una aclaración o el producto no existe, items debe ser []. No inventes productos, precios ni IDs.`,
          },
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

    return NextResponse.json({
      reply: typeof parsed?.reply === "string" ? parsed.reply.slice(0, 320) : "Listo, revisá tu pedido.",
      items,
    });
  } catch (error) {
    console.error("[voice-order]", error);
    return NextResponse.json({ error: "No pude procesar el pedido por voz." }, { status: 500 });
  }
}
