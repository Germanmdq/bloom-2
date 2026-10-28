import type { SupabaseClient } from "@supabase/supabase-js";
import type { MenuProduct } from "./core";

/**
 * Lee la carta COMPLETA de la base en cada conversación: categorías, productos, descripciones, precios y
 * disponibilidad (activo y con stock). Nada está escrito fijo: si cambia un precio o se agota algo, el
 * agente lo sabe en la próxima conversación.
 */
export async function loadMenu(db: SupabaseClient) {
  const [cats, prods, settings] = await Promise.all([
    db.from("categories").select("id, name, sort_order").order("sort_order", { ascending: true, nullsFirst: false }),
    db
      .from("products")
      .select("id, name, description, price, category_id, active, kind, track_stock, stock, options")
      .eq("active", true)
      .order("name"),
    db.from("app_settings").select("plato_del_dia_id, plato_dia_price").eq("id", 1).maybeSingle(),
  ]);
  if (cats.error) throw new Error(`categories: ${cats.error.message}`);
  if (prods.error) throw new Error(`products: ${prods.error.message}`);

  const catName = new Map<string, string>();
  const catOrder = new Map<string, number>();
  (cats.data ?? []).forEach((c: any, i: number) => {
    catName.set(c.id, c.name);
    catOrder.set(c.id, i);
  });
  const platoId = settings.data?.plato_del_dia_id ?? null;
  const platoPrice = Number(settings.data?.plato_dia_price) || 0;

  const products: MenuProduct[] = (prods.data ?? [])
    .filter((p: any) => p.kind !== "raw") // insumos no son carta
    .map((p: any) => {
      const track = p.track_stock === true;
      const stock = track ? Number(p.stock) || 0 : null;
      const opts = Array.isArray(p.options)
        ? p.options
            .map((o: any) => {
              const values = Array.isArray(o?.values) ? o.values : Array.isArray(o?.choices) ? o.choices : [];
              return o?.name && values.length ? `${o.name}: ${values.join("/")}` : "";
            })
            .filter(Boolean)
            .join("; ")
        : "";
      return {
        id: String(p.id).toLowerCase(),
        name: String(p.name),
        description: String(p.description ?? "").slice(0, 160),
        // El plato del día tiene su propio precio en la configuración del local.
        price: p.id === platoId && platoPrice > 0 ? platoPrice : Number(p.price) || 0,
        category: p.category_id ? catName.get(p.category_id) ?? "Otros" : "Otros",
        available: stock === null || stock > 0,
        stock,
        options: opts,
      };
    })
    .sort((a, b) => {
      const ca = [...catName.entries()].find(([, n]) => n === a.category)?.[0];
      const cb = [...catName.entries()].find(([, n]) => n === b.category)?.[0];
      return (catOrder.get(ca ?? "") ?? 999) - (catOrder.get(cb ?? "") ?? 999) || a.name.localeCompare(b.name, "es");
    });

  const byId = new Map(products.map((p) => [p.id, p]));
  const byNumber = new Map(products.map((p, i) => [i + 1, p])); // #n corto para el modelo (menos tokens y errores)
  const numberOf = new Map(products.map((p, i) => [p.id, i + 1]));

  let current = "";
  const lines: string[] = [];
  for (const p of products) {
    if (p.category !== current) {
      current = p.category;
      lines.push(`\n${current.toUpperCase()}`);
    }
    lines.push(
      `#${numberOf.get(p.id)} ${p.name} | $${Math.round(p.price).toLocaleString("es-AR")}` +
        `${p.description ? ` | ${p.description}` : ""}${p.options ? ` | opciones -> ${p.options}` : ""}` +
        `${p.available ? "" : " | AGOTADO"}`,
    );
  }
  return { products, byId, byNumber, numberOf, text: lines.join("\n").trim() };
}

export type LiveMenu = Awaited<ReturnType<typeof loadMenu>>;
