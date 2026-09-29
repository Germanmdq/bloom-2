import { NextRequest } from "next/server";
import Groq, { APIError } from "groq-sdk";
import type { ChatCompletionChunk } from "groq-sdk/resources/chat/completions";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "llama-3.1-8b-instant";

/** Mensaje mínimo para el primer turno (evitar prompt vacío). */
const OPENING_USER_PLACEHOLDER = "\u200b";

const LOG = "[bloom-chat]";

function getGroq(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

/** Convierte mensajes del cliente (user/assistant) al formato chat. El primer turno debe ser user. */
function messagesToGroqTurns(messages: { role: "user" | "assistant" | "system"; content: string }[]) {
  const turns = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  if (turns.length > 0 && turns[0].role === "assistant") {
    return [{ role: "user" as const, content: OPENING_USER_PLACEHOLDER }, ...turns];
  }
  return turns;
}

function formatArs(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function timeOfDayLabel(clientTimeISO: string): "mañana" | "tarde" | "noche" {
  const h = new Date(clientTimeISO).getHours();
  if (h < 12) return "mañana";
  if (h < 20) return "tarde";
  return "noche";
}

/** Franja para sugerencias de mozo (desayuno / almuerzo / merienda / cena). */
function mealSuggestionLine(clientTimeISO: string): string {
  const h = new Date(clientTimeISO).getHours();
  if (h >= 5 && h < 11) return "Es mañana: podés sugerir desayuno, café, medialunas o tostadas.";
  if (h >= 11 && h < 15) return "Es mediodía: podés sugerir platos del día o opciones para almorzar.";
  if (h >= 15 && h < 19) return "Es tarde: merienda, café con algo dulce o salado, opciones livianas.";
  if (h >= 19 && h < 24) return "Es noche: podés sugerir cena o platos más contundentes.";
  return "Horario poco habitual: ofrecé café, algo liviano o lo clásico de la carta.";
}

const MAX_MENU_PRODUCTS = 20;

type MenuProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  options: unknown;
};

type MenuCtx = {
  menuText: string;
  categoriesListText: string;
  productScopeNote: string;
  platoBlock: string;
  topSellersBlock: string;
  tod: "mañana" | "tarde" | "noche";
  mealLine: string;
};

/** Incluye siempre el plato del día; si hay `category`, solo productos de esa categoría (nombre, sin distinguir mayúsculas). Máximo `maxTotal` ítems. */
function pickProductsForMenuText(
  productList: MenuProductRow[],
  catMap: Map<string, string>,
  platoId: string | null,
  category: string | undefined,
  maxTotal: number
): MenuProductRow[] {
  const catNorm = category?.trim().toLowerCase();
  const plato = platoId ? productList.find((x) => x.id === platoId) : undefined;

  const inScope = (p: MenuProductRow): boolean => {
    if (!catNorm) return true;
    const n = (catMap.get(p.category_id ?? "") ?? "").trim().toLowerCase();
    return n === catNorm;
  };

  const ordered: MenuProductRow[] = [];
  const seen = new Set<string>();

  const push = (p: MenuProductRow) => {
    if (seen.has(p.id) || ordered.length >= maxTotal) return;
    seen.add(p.id);
    ordered.push(p);
  };

  if (plato) {
    push(plato);
  }

  const rest = productList
    .filter((p) => {
      if (plato && p.id === plato.id) return false;
      return inScope(p);
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  for (const p of rest) {
    push(p);
    if (ordered.length >= maxTotal) break;
  }

  return ordered;
}

async function loadMenuContext(
  clientTimeISO: string,
  supabaseUrl: string,
  category?: string | null
): Promise<MenuCtx> {
  const supabase = createClient(supabaseUrl, getSupabaseAnonKey());
  const tod = timeOfDayLabel(clientTimeISO);
  const mealLine = mealSuggestionLine(clientTimeISO);

  const catRes = await supabase.from("categories").select("id, name, sort_order").order("sort_order", { ascending: true });
  console.error(`${LOG} supabase categories`, {
    ok: !catRes.error,
    error: catRes.error?.message,
    code: catRes.error?.code,
    rowCount: catRes.data?.length ?? 0,
  });

  const prodRes = await supabase
    .from("products")
    .select("id, name, description, price, category_id, active, options")
    .eq("active", true)
    .order("name");
  console.error(`${LOG} supabase products`, {
    ok: !prodRes.error,
    error: prodRes.error?.message,
    code: prodRes.error?.code,
    rowCount: prodRes.data?.length ?? 0,
  });

  const settingsRes = await supabase.from("app_settings").select("plato_del_dia_id").eq("id", 1).maybeSingle();
  console.error(`${LOG} supabase app_settings`, {
    ok: !settingsRes.error,
    error: settingsRes.error?.message,
    code: settingsRes.error?.code,
    hasRow: settingsRes.data != null,
  });

  const categories = catRes.data;
  const products = prodRes.data;
  const settings = settingsRes.data;

  const catMap = new Map<string, string>();
  for (const c of categories ?? []) {
    catMap.set(c.id, c.name);
  }

  const productList = products ?? [];
  const platoId = settings?.plato_del_dia_id ?? null;

  const categoriesListText = (categories ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((c) => c.name)
    .join("; ");

  const catTrim = category?.trim() ?? "";
  const productScopeNote = catTrim
    ? `Lista de productos acotada a la categoría «${catTrim}» (comparación sin distinguir mayúsculas), siempre incluyendo el plato del día si está configurado. Máximo ${MAX_MENU_PRODUCTS} ítems.`
    : `Lista de productos: hasta ${MAX_MENU_PRODUCTS} ítems activos (vista resumida del menú).`;
  let platoBlock =
    "Hoy no hay plato del día cargado en el sistema. No inventes uno; decilo si preguntan.";
  if (platoId) {
    const plato = productList.find((x) => x.id === platoId);
    if (plato) {
      platoBlock = `Plato del día de hoy: "${plato.name}" a ${formatArs(Number(plato.price))} (id producto: ${platoId}). En el PRIMER mensaje siempre nombralo con el precio.`;
    }
  }

  let topSellersBlock = "No hay datos de lo más pedido todavía.";
  const salesRes = await supabase
    .from("categories")
    .select("id, name, sales_count")
    .order("sales_count", { ascending: false, nullsFirst: false })
    .limit(3);
  console.error(`${LOG} supabase categories by sales_count`, {
    ok: !salesRes.error,
    error: salesRes.error?.message,
    code: salesRes.error?.code,
    details: salesRes.error?.details,
    rowCount: salesRes.data?.length ?? 0,
  });

  const topCatsBySales = salesRes.data;
  const salesErr = salesRes.error;

  let topCatIds: { id: string; name: string }[] = [];
  if (!salesErr && topCatsBySales?.length) {
    topCatIds = topCatsBySales.map((c) => ({ id: c.id, name: c.name }));
  } else {
    topCatIds = (categories ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .slice(0, 3)
      .map((c) => ({ id: c.id, name: c.name }));
  }

  const topSellerLines: string[] = [];
  for (const cat of topCatIds) {
    const inCat = productList.filter((p) => p.category_id === cat.id);
    const pick = inCat.sort((a, b) => a.name.localeCompare(b.name, "es"))[0];
    if (pick) {
      topSellerLines.push(`"${pick.name}" (${cat.name}) ${formatArs(Number(pick.price))} [id: ${pick.id}]`);
    }
  }
  if (topSellerLines.length) {
    topSellersBlock = `Lo más pedido últimamente (referencia, podés mencionar uno o dos si encaja): ${topSellerLines.join("; ")}.`;
  }

  const picked = pickProductsForMenuText(
    productList as MenuProductRow[],
    catMap,
    platoId,
    catTrim || undefined,
    MAX_MENU_PRODUCTS
  );

  const lines: string[] = [];
  for (const p of picked) {
    const cat = catMap.get(p.category_id ?? "") ?? "General";
    const isPlato = platoId && p.id === platoId;
    const desc = (p.description || "").trim();
    const opts = p.options != null ? ` Opciones: ${JSON.stringify(p.options)}` : "";
    lines.push(
      `[${cat}] ${p.name} — ${formatArs(Number(p.price))}${isPlato ? " (PLATO DEL DÍA)" : ""}${desc ? ` — ${desc}` : ""}${opts} [id: ${p.id}]`
    );
  }

  const menuText = lines.join("\n");

  return {
    menuText,
    categoriesListText,
    productScopeNote,
    platoBlock,
    topSellersBlock,
    tod,
    mealLine,
  };
}

function buildSystemPrompt(ctx: MenuCtx, clientTimeISO: string, opts: { openingAppend?: string }) {
  const openingAppend = opts.openingAppend ?? "";

  return `You are the virtual waiter of Bloom Café & More in Mar del Plata (Bárbara y Agustín).
You reply in natural Argentine Spanish (vos), warm and professional — like a good waiter: friendly, clear, never theatrical. Do not use lunfardo or fillers: never "che", "dale", "bárbaro", or similar slang. Do not use the word "apetece".

Your job is to guide the customer through ordering.

Clock (client): ${clientTimeISO}. Time of day word: ${ctx.tod} (use for greeting: buenos días / buenas tardes / buenas noches when it fits).
${ctx.mealLine}

All category names in the venue (for context; may be more than the filtered product list):
${ctx.categoriesListText}

${ctx.productScopeNote}

Today's special and bestsellers (use these facts, don't invent others):
${ctx.platoBlock}
${ctx.topSellersBlock}

Products in scope for this reply (prices ARS; only recommend what appears here; never invent prices or dishes):
${ctx.menuText}

How you behave (your replies to the customer, not this list format): Always mention today's special with its price in the FIRST message if the facts above include a plato del día; if there isn't one, don't invent it. Suggest based on time of day using the meal hint. If they ask something vague, give a few concrete options with prices in flowing prose, not the whole menu.

When listing products in a category (or after they tap a category card), list at most 5 products from the menu text only. Put ONE product per line in this exact format:
Nombre — $precio — descripción corta
Use a real en dash between parts; keep the description short (a few words). No long paragraphs for that list. After the list, ask ONE short follow-up question such as "¿Cuál te anoto?" and nothing else long.

When you mention a product with its price in conversational prose (outside that line list), use straight double quotes around the product name and either "a" or "por" before the peso amount, e.g. "Medialunas" a $800 or el "Café cortado" por $500, so the app can show order cards. You may mix the line list format above with a final short question without repeating every price in prose.

When they pick something, confirm and ask if they want anything else. When they're done, ask their name and if it's para llevar or para comer acá. Then give the total and confirm. Write like speech except for the category list format above: no lines starting with hyphen or asterisk as bullet markers, no markdown bullet lists. Avoid "¡Claro!", "¡Por supuesto!" and generic assistant phrases.

When the customer explicitly confirms the final order (e.g. listo, confirmo, está bien, mandá el pedido), reply with a short closing in natural prose AND in the SAME message include a single JSON object (no markdown code fence) exactly like:
{"order_ready":true,"customer_name":"...","customer_phone":"...","service":"takeaway"|"salon","items":[{"product_id":"uuid","name":"...","price":1234,"quantity":1}]}
Use customer_phone empty string if they didn't give a number but confirmed; prefer asking for a contact if takeaway. service: "takeaway" para llevar, "salon" para comer en el local.
Prices and names must match the menu. If something is missing, ask before emitting JSON.
If the order is not confirmed, do not include order_ready true.${openingAppend}`;
}

function streamGroqText(stream: AsyncIterable<ChatCompletionChunk>) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const raw = chunk.choices[0]?.delta?.content;
          const text = raw == null ? "" : raw;
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      } catch (e) {
        console.error(`${LOG} streamGroqText error`, e);
        if (e instanceof Error) console.error(e.stack);
        try {
          controller.error(e);
        } catch {
          /* closed */
        }
      }
    },
  });
}

export async function POST(request: NextRequest) {
  console.error("[bloom-chat] GROQ_API_KEY present:", !!process.env.GROQ_API_KEY, "length:", process.env.GROQ_API_KEY?.length);

  try {
    const groq = getGroq();
    if (!groq) {
      console.error(`${LOG} abort: no Groq client (missing API key)`);
      return new Response(JSON.stringify({ error: "GROQ_API_KEY no configurada" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: {
      mode?: "opening" | "chat";
      messages?: { role: "user" | "assistant" | "system"; content: string }[];
      clientTimeISO?: string;
      /** Si viene, el menú en contexto solo incluye productos de esta categoría (+ plato del día). */
      category?: string;
    };

    try {
      body = await request.json();
    } catch (parseErr) {
      console.error(`${LOG} invalid JSON body`, parseErr);
      return new Response(JSON.stringify({ error: "JSON inválido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = getSupabaseUrl();
    console.error(`${LOG} Supabase URL configured`, !!supabaseUrl, "length", supabaseUrl?.length ?? 0);

    const clientTimeISO = body.clientTimeISO || new Date().toISOString();
    const category = typeof body.category === "string" ? body.category : undefined;
    const ctx = await loadMenuContext(clientTimeISO, supabaseUrl, category);
    console.error(`${LOG} menu context loaded`, {
      menuChars: ctx.menuText.length,
      tod: ctx.tod,
      category: category ?? null,
    });

    const openingAppend =
      body.mode === "opening"
        ? `\n\nOPENING TURN: The customer has not spoken yet. You open the conversation alone. One message only: greet for the time of day, mention today's special with price (if configured), tease something from the top sellers if natural, and invite them to order. Three to five short sentences. Seductive waiter energy, not a support bot.`
        : "";

    const systemContent = buildSystemPrompt(ctx, clientTimeISO, { openingAppend });

    if (body.mode === "opening") {
      console.error(`${LOG} Groq request`, { mode: "opening", model: MODEL });
      const streamResult = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: OPENING_USER_PLACEHOLDER },
        ],
        temperature: 0.85,
        max_tokens: 400,
        stream: true,
      });
      return new Response(streamGroqText(streamResult), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const messages = body.messages ?? [];
    console.error(`${LOG} Groq request`, { mode: "chat", model: MODEL, messageCount: messages.length });
    const turns = messagesToGroqTurns(messages);
    if (turns.length === 0) {
      return new Response(JSON.stringify({ error: "messages vacío" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const streamResult = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "system", content: systemContent }, ...turns],
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    });

    return new Response(streamGroqText(streamResult), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    console.error(`${LOG} POST failed`, err);
    if (err instanceof Error) {
      console.error(`${LOG} name`, err.name, "message", err.message);
      console.error(`${LOG} stack`, err.stack);
    }

    const is429 =
      (err instanceof APIError && err.status === 429) ||
      (typeof err === "object" &&
        err !== null &&
        "status" in err &&
        (err as { status?: number }).status === 429);

    if (is429) {
      return new Response(
        JSON.stringify({
          error: "rate_limited",
          message: "El asistente está descansando un momento, volvé a intentar en unos minutos.",
        }),
        { status: 429, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const message = err instanceof Error ? err.message : String(err);
    const isDev = process.env.NODE_ENV === "development";
    return new Response(
      JSON.stringify({
        error: "Error en bloom-chat",
        ...(isDev ? { detail: message } : {}),
      }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}
