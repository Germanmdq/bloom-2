// Reglas de presentación del menú público:
// - Cada modalidad (Salón / Take Away) muestra solo sus productos.
// - Los combos (productos con "+" en el nombre o en la descripción) se muestran
//   solamente dentro de Promos.
// - Los productos con variantes (tamaño, sabor, tipo, preparación, cantidad…)
//   se agrupan en un único ítem; las opciones se eligen en la hoja inferior.
//   Las variantes son los productos ya cargados; las opciones extra (sabores,
//   guarniciones, salsas, facturas…) son las de la carta del local.

export type Modality = "salon" | "takeaway";

export interface MenuVariant {
  productId: string;
  productName: string;
  /** Texto que se muestra en el selector */
  label: string;
  /** Nombre con el que entra al pedido */
  cartName: string;
  price: number;
  image_url?: string;
}

export interface MenuOption {
  name: string;
  choices: string[];
  /** Si tiene valor por defecto no es obligatorio tocarlo */
  defaultIndex?: number;
}

/** Opción que depende de la variante elegida (ej. "+2" → 2 facturas) */
export interface CountedOption {
  name: string;
  choices: string[];
  count: (variantLabel: string) => number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category_id: string;
  image_url?: string;
  /** Precio más bajo entre sus variantes */
  price: number;
  variants: MenuVariant[];
  variantTitle: string;
  options: MenuOption[];
  /** Una rueda por unidad (ej. elegir cada factura) */
  repeat?: CountedOption;
  /** Elegir exactamente N de una lista (ej. ingredientes) */
  pick?: CountedOption;
}

export const PROMO_CATEGORY_NAMES = ["promos", "ofertas", "promociones"];
export const VIRTUAL_PROMO_CATEGORY_ID = "cat-promos";

const FACTURAS = [
  "Medialuna dulce",
  "Medialuna salada",
  "Torta negra",
  "Vigilante con azúcar",
  "Vigilante con pastelera",
  "Factura con crema pastelera",
];
const TIPO_MILANESA = ["Ternera", "Pollo"];
const GUARNICIONES = ["Papas fritas", "Ensalada", "Puré"];

const countFromPlus = (label: string) => Number(label.match(/\+\s*(\d)/)?.[1] ?? 0);
const countFromDigit = (label: string) => Number(label.match(/(\d)/)?.[1] ?? 0);

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
// "NAPOLITANA" → "Napolitana"; respeta mayúsculas mezcladas como "JyQ"
const tidy = (s: string) => {
  const t = s.replace(/\s+/g, " ").replace(/^1\/2\b/, "½").trim();
  return capitalize(t === t.toUpperCase() ? t.toLowerCase() : t);
};
const stripWord = (re: RegExp) => (name: string) => tidy(name.replace(re, "")) || tidy(name);

interface GroupDef {
  id: string;
  name: string;
  description: string;
  match: RegExp;
  variantTitle?: string;
  /** Texto de cada variante en el selector */
  label?: (productName: string) => string[];
  /** Si entra al pedido con la etiqueta en vez del nombre del producto */
  cartUsesLabel?: boolean;
  options?: MenuOption[];
  /** Opción tomada del paréntesis del nombre: "Licuado (banana / frutilla)" */
  parenOption?: string;
  repeat?: CountedOption;
  pick?: CountedOption;
  /** No agrupa: cada producto que coincide es un ítem con estas opciones */
  perProduct?: boolean;
  /** Sus combos (ej. café + facturas) se eligen dentro del grupo, no en Promos */
  keepCombos?: boolean;
}

// El orden importa: gana la primera regla que coincide.
const GROUPS: GroupDef[] = [
  {
    id: "group-cafe-llevar",
    name: "Café",
    description: "Elegí tamaño, tipo de café y acompañamiento.",
    match: /^caf[eé] delivery/i,
    variantTitle: "Tamaño y acompañamiento",
    label: (n) => {
      const size = /grande/i.test(n) ? "Grande" : "Chico";
      const qty = countFromPlus(n);
      return [qty ? `${size} + ${qty} ${qty === 1 ? "factura" : "facturas"}` : size];
    },
    options: [
      {
        name: "Tipo de café",
        choices: ["Lágrima", "Cortado", "Café con leche", "Apenas cortado", "Latte", "Café americano"],
      },
    ],
    repeat: { name: "Factura", choices: FACTURAS, count: countFromPlus },
    keepCombos: true,
  },
  {
    id: "group-cafe",
    name: "Café",
    description: "Elegí cómo querés tu café.",
    match: /^caf[eé](?=\s|$)/i,
    variantTitle: "Tipo de café",
    label: splitVariantNames,
    cartUsesLabel: true,
  },
  {
    id: "group-te",
    name: "Té",
    description: "Elegí el tipo de té o mate cocido.",
    match: /^(t[eé]|mate cocido)(?=\s|$)/i,
    variantTitle: "Tipo",
    label: (n) => splitVariantNames(n.replace(/\s*delivery\s*/i, " ").trim()),
    cartUsesLabel: true,
  },
  {
    id: "group-empanadas",
    name: "Empanadas",
    description: "Elegí sabor y cantidad.",
    match: /empanada/i,
    variantTitle: "Cantidad",
    label: (n) => [stripWord(/empanadas?|[()]/gi)(n)],
    options: [{ name: "Sabor", choices: ["Carne", "Pollo", "Jamón y queso", "Choclo"] }],
  },
  {
    id: "group-sandwich-milanesa",
    name: "Sándwich de milanesa",
    description: "De ternera o de pollo.",
    match: /s[aá]ndwich (de )?milanesa/i,
    variantTitle: "Presentación",
    label: (n) => [tidy(n.replace(/s[aá]ndwich (de )?milanesa/i, "")) || "Solo, sin guarnición"],
    options: [{ name: "Tipo de milanesa", choices: TIPO_MILANESA }],
  },
  {
    id: "group-milanesas",
    name: "Milanesas",
    description: "De ternera o de pollo. Todas con guarnición.",
    match: /^milanesa/i,
    variantTitle: "Preparación",
    label: (n) => [stripWord(/^milanesa/i)(n)],
    options: [{ name: "Tipo de milanesa", choices: TIPO_MILANESA }],
  },
  {
    id: "group-hamburguesas",
    name: "Hamburguesas",
    description: "Todas con papas fritas.",
    match: /^hamburguesa/i,
    variantTitle: "Preparación",
    label: (n) => [stripWord(/^hamburguesa/i)(n)],
    options: [
      {
        name: "Opción veggie",
        choices: ["No", "Sí (lentejas o garbanzos, según disponibilidad)"],
        defaultIndex: 0,
      },
    ],
  },
  {
    id: "group-pizzas",
    name: "Pizzas",
    description: "Elegí la variedad.",
    match: /^pizza/i,
    variantTitle: "Variedad",
    label: (n) => [stripWord(/^pizza/i)(n)],
  },
  {
    id: "group-tartas",
    name: "Tartas individuales",
    description: "Elegí la variedad.",
    match: /^tarta (?!de coco)/i,
    variantTitle: "Variedad",
    label: (n) => [stripWord(/^tarta/i)(n)],
  },
  {
    id: "group-pastas",
    name: "Pastas",
    description: "Elegí la pasta y la salsa.",
    match: /^(spaghetti|ñoquis|ravioles|sorrentinos|canelones)/i,
    variantTitle: "Pasta",
    label: (n) => [tidy(n)],
    options: [{ name: "Salsa", choices: ["Filetto", "Bolognesa", "Blanca", "Mixta"] }],
  },
  {
    id: "group-tostados",
    name: "Tostados",
    description: "Pan de miga o pan árabe.",
    match: /tostado (de )?(miga|pan)/i,
    variantTitle: "Variedad",
    label: (n) => [tidy(n)],
  },
  {
    id: "group-arabe-pollo",
    name: "Sándwich de pollo",
    description: "En pan árabe con pechuga grillé. Armalo a tu gusto.",
    match: /[aá]rabe pollo/i,
    variantTitle: "Cantidad de ingredientes",
    label: (n) => [`${countFromDigit(n)} ingredientes`],
    pick: {
      name: "Ingredientes",
      choices: ["Lechuga", "Tomate", "Queso", "Jamón", "Huevo", "Palta"],
      count: countFromDigit,
    },
  },
  {
    id: "group-exprimido",
    name: "Exprimido de naranja",
    description: "Entero o medio.",
    match: /exprimido/i,
    variantTitle: "Tamaño",
    label: (n) => [/medio/i.test(n) ? "Medio" : "Entero"],
  },
  {
    id: "group-licuado",
    name: "Licuado",
    description: "Elegí el sabor.",
    match: /^licuado/i,
    label: (n) => [tidy(n.replace(/\(.*\)/, ""))],
    parenOption: "Sabor",
  },
  {
    id: "per-guarnicion",
    name: "",
    description: "",
    match: /guarnici[oó]n/i,
    perProduct: true,
    options: [{ name: "Guarnición", choices: GUARNICIONES }],
  },
  {
    id: "per-gaseosa",
    name: "",
    description: "",
    match: /^gaseosa/i,
    perProduct: true,
    options: [
      {
        name: "Gaseosa",
        choices: ["Coca-Cola", "Coca-Cola Zero", "Sprite", "Sprite Zero", "Fanta", "Schweppes Pomelo Zero"],
      },
    ],
  },
  {
    id: "per-aquarius",
    name: "",
    description: "",
    match: /aquarius/i,
    perProduct: true,
    options: [{ name: "Sabor", choices: ["Pera", "Pomelo", "Naranja", "Manzana"] }],
  },
  {
    id: "per-agua",
    name: "",
    description: "",
    match: /^agua con o sin gas/i,
    perProduct: true,
    options: [{ name: "Tipo", choices: ["Sin gas", "Con gas"] }],
  },
  {
    id: "per-factura",
    name: "",
    description: "",
    match: /^factura \(unidad\)/i,
    perProduct: true,
    options: [{ name: "Factura", choices: FACTURAS }],
  },
];

export const isCombo = (p: { name?: string; description?: string | null }) =>
  /\+/.test(p.name ?? "") || /\s\+\s/.test(p.description ?? "");

export const isPromoCategory = (cat: { name?: string }) =>
  PROMO_CATEGORY_NAMES.includes((cat.name ?? "").trim().toLowerCase());

// "Té / Saborizado / Mate Cocido" → ["Té", "Té saborizado", "Mate Cocido"]
// "Café c/ Leche - Lágrima Doble"  → ["Café c/ Leche", "Lágrima Doble"]
export function splitVariantNames(name: string): string[] {
  const parts = name.split(/\s+[/-]\s+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return [name.trim()];
  const head = parts[0].split(/\s+/)[0];
  return parts.map((part, i) =>
    i > 0 && !/\s/.test(part) ? `${head} ${part.toLowerCase()}` : part
  );
}

// ---------- Modalidad ----------

const isTakeawayVersion = (p: any) => /delivery/i.test(p.name ?? "");

const infusionKind = (name: string) => {
  if (/capuc+h?ino/i.test(name)) return "capuchino";
  if (/^(t[eé]|mate cocido)(?=\s|$)/i.test(name)) return "te";
  if (/caf[eé]|jarrito|pocillo|cortado|l[aá]grima/i.test(name)) return "cafe";
  return null;
};

/**
 * Take Away usa las versiones "Delivery" (para llevar) de las infusiones, y
 * Salón las de taza. Los desayunos/meriendas ("Infusión + …") son de salón.
 * El resto de la carta está en las dos modalidades.
 */
export function filterByModality(products: any[], modality: Modality) {
  const kindsForTakeaway = new Set(
    products.filter(isTakeawayVersion).map((p) => infusionKind(p.name)).filter(Boolean)
  );
  return products.filter((p) => {
    if (isTakeawayVersion(p)) return modality === "takeaway";
    const kind = infusionKind(p.name ?? "");
    const salonOnly =
      (kind !== null && kindsForTakeaway.has(kind)) || /^infusi[oó]n\b/i.test(p.description ?? "");
    return salonOnly ? modality === "salon" : true;
  });
}

// ---------- Catálogo ----------

function singleItem(p: any, categoryId: string, def?: GroupDef): MenuItem {
  const price = Number(p.price) || 0;
  return {
    id: p.id,
    // En Take Away "Delivery" es redundante: se muestra solo el nombre
    name: tidy(p.name.replace(/\s*delivery\b/i, "")),
    description: p.description ?? "",
    category_id: categoryId,
    image_url: p.image_url,
    price,
    variants: [
      { productId: p.id, productName: p.name, label: p.name, cartName: p.name, price, image_url: p.image_url },
    ],
    variantTitle: "",
    options: def?.options ?? [],
  };
}

/**
 * Devuelve los ítems a mostrar para la modalidad (productos sueltos y
 * agrupados) y las categorías que tienen algo para mostrar.
 */
export function buildCatalog(categories: any[], products: any[], modality: Modality) {
  const promoCat = categories.find(isPromoCategory);
  const promoCategoryId: string = promoCat?.id ?? VIRTUAL_PROMO_CATEGORY_ID;

  // Los productos con precio 0 son opciones internas (p. ej. candidatos a
  // Plato del Día); no se venden sueltos.
  const sellable = filterByModality(products, modality).filter((p) => Number(p.price) > 0);

  const items: MenuItem[] = [];
  const groups = new Map<string, MenuItem>();

  for (const p of sellable) {
    const matched = GROUPS.find((g) => g.match.test(p.name ?? ""));
    const toPromos =
      !matched?.keepCombos && (isCombo(p) || p.category_id === promoCategoryId);
    const categoryId = toPromos ? promoCategoryId : p.category_id;
    const def = toPromos ? undefined : matched;

    if (!def) {
      items.push(singleItem(p, categoryId));
      continue;
    }
    if (def.perProduct) {
      items.push(singleItem(p, categoryId, def));
      continue;
    }

    let group = groups.get(def.id);
    if (!group) {
      group = {
        id: def.id,
        name: def.name,
        description: def.description,
        category_id: categoryId,
        image_url: p.image_url,
        price: Number(p.price) || 0,
        variants: [],
        variantTitle: def.variantTitle ?? "Opción",
        options: [...(def.options ?? [])],
        repeat: def.repeat,
        pick: def.pick,
      };
      groups.set(def.id, group);
      items.push(group);
    }

    if (def.parenOption) {
      const inParens = p.name.match(/\(([^)]+)\)/)?.[1];
      if (inParens && !group.options.some((o) => o.name === def.parenOption)) {
        group.options.push({
          name: def.parenOption,
          choices: inParens.split("/").map((s: string) => capitalize(s.trim())),
        });
      }
    }

    const price = Number(p.price) || 0;
    for (const label of def.label ? def.label(p.name) : [p.name]) {
      group.variants.push({
        productId: p.id,
        productName: p.name,
        label,
        cartName: def.cartUsesLabel ? label : p.name,
        price,
        image_url: p.image_url,
      });
    }
    group.image_url ||= p.image_url;
    group.price = Math.min(...group.variants.map((v) => v.price));
  }

  // Variantes ordenadas por precio (más barata primero)
  for (const group of groups.values()) group.variants.sort((a, b) => a.price - b.price);

  const displayCategories = categories
    .filter((c) => !isPromoCategory(c))
    .concat([{ id: promoCategoryId, name: "Promos" }])
    .filter((c) => items.some((it) => it.category_id === c.id));

  return { items, displayCategories, promoCategoryId };
}

/** Un producto suelto (ej. el Plato del Día) como ítem para la hoja inferior */
export const toMenuItem = (p: any): MenuItem => singleItem(p, p.category_id);
