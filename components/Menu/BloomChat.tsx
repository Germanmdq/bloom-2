"use client";

import Link from "next/link";
import IconPhoto from "next/image";
import { useRouter } from "next/navigation";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { IconMessageCircle, IconX, IconLoader2, IconCheck, IconShoppingBag, IconPlus, IconMinus } from "@tabler/icons-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export type ProductOptionGroup = {
  name: string;
  min: number;
  max: number;
  options: string[];
};

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url?: string | null;
  category_id: string | null;
  /** Nombre de categoría (join) para sugerencias post-encargo */
  category_name?: string | null;
  /** Categoría interna (promocion, plato_del_dia, oferta_del_dia) */
  kind?: string | null;
  /** Lista plana desde `products.options.variants` (ej. gaseosas). */
  variants?: string[];
  /** Grupos desde `products.options.groups` (platos, pastas, etc.). */
  optionGroups?: ProductOptionGroup[];
};

type CartLine = {
  lineId: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  observations: string;
  /** Detalle para el pedido / ticket */
  variants?: { name: string }[];
  /** Producto tenía opciones configurables (plano o grupos). */
  productHadVariants?: boolean;
};

export type VariantChoice = {
  summaryLabel: string;
  variants: { name: string }[];
};

function drinkVariantsFromOptions(options: unknown): string[] {
  if (options == null || typeof options !== "object" || Array.isArray(options)) return [];
  const v = (options as { variants?: unknown }).variants;
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
}

function optionGroupsFromJson(options: unknown): ProductOptionGroup[] {
  if (options == null || typeof options !== "object" || Array.isArray(options)) return [];
  const raw = (options as { groups?: unknown }).groups;
  if (!Array.isArray(raw)) return [];
  const out: ProductOptionGroup[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== "object") continue;
    const name = typeof (item as { name?: unknown }).name === "string" ? (item as { name: string }).name.trim() : "";
    const min = Number((item as { min?: unknown }).min);
    const max = Number((item as { max?: unknown }).max);
    const opts = (item as { options?: unknown }).options;
    const optionsList = Array.isArray(opts)
      ? opts
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .map((s) => s.trim())
      : [];
    if (!name || !optionsList.length) continue;
    out.push({
      name,
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : 1,
      options: optionsList,
    });
  }
  return out;
}

function parseProductOptionsRow(options: unknown): Pick<ProductRow, "variants" | "optionGroups"> {
  const groups = optionGroupsFromJson(options);
  if (groups.length > 0) return { optionGroups: groups };
  const flat = drinkVariantsFromOptions(options);
  if (flat.length > 0) return { variants: flat };
  return {};
}

function isPlatoOrMenu(p: ProductRow) {
  const catNameLower = (p.category_name || "").toLowerCase();
  const itemNameLower = (p.name || "").toLowerCase();
  return catNameLower.includes("plato") || catNameLower.includes("menú") || catNameLower.includes("especial") || catNameLower.includes("oferta") || itemNameLower.includes("especial") || itemNameLower.includes("oferta") || itemNameLower.includes("plato") || itemNameLower.includes("menú") || p.kind === 'plato_del_dia' || p.kind === 'oferta_del_dia';
}

function getInjectedOptionGroups(p: ProductRow): ProductOptionGroup[] {
  if (isPlatoOrMenu(p)) {
    return [
      {
        name: "Bebida",
        min: 1,
        max: 1,
        options: ["Coca-Cola", "Coca Zero", "Sprite", "Sprite Zero", "Schweppes Pomelo", "Aquarius Pera", "Aquarius Manzana", "Aquarius Pomelo", "Aquarius Uva", "Agua Sin Gas", "Agua Con Gas", "Cerveza Patagonia", "Cerveza Stella Artois", "Copa de Vino", "Sin bebida"]
      },
      {
        name: "Guarnición",
        min: 1,
        max: 1,
        options: ["Papas Fritas", "Puré de Papas", "Puré de Calabaza", "Mix de Verdes", "Sin guarnición"]
      }
    ];
  }
  return [];
}

function productHasConfigurableOptions(p: ProductRow): boolean {
  return (p.variants?.length ?? 0) > 0 || (p.optionGroups?.length ?? 0) > 0 || getInjectedOptionGroups(p).length > 0;
}

export type OpenCategoryOpts = {
  displayName: string;
  categoryId?: string | null;
  productIds?: string[];
  /** Desde la home (destacado): tarjeta arriba + acceso al menú completo; «Ver categorías» va a /menu. */
  fromHomeFeatured?: boolean;
};

export type BloomChatHandle = {
  openWithCategoryMessage: (opts: OpenCategoryOpts) => void;
  openChat: () => void;
  /** Carga la categoría del producto, abre el chat y lo agrega como si hubiera tocado Encargar. */
  openWithProductEncargado: (productId: string) => Promise<void>;
};

function formatArs(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function timeGreeting(): "Buenos días" | "Buenas tardes" | "Buenas noches" {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "Buenos días";
  if (h >= 12 && h < 18) return "Buenas tardes";
  return "Buenas noches";
}

function categoryIntro(displayName: string) {
  const t = timeGreeting();
  return `${t}! Estos son los productos de ${displayName}:`;
}

function genericIntro() {
  const t = timeGreeting();
  return `${t}! Tocá una categoría en el menú para ver productos y armar tu encargo.`;
}

/** Dirección guardada en metadata: calle… y opcionalmente " - piso/dpto". */
function splitSavedAddress(raw: string): { line: string; extra: string } {
  const t = raw.trim();
  if (!t) return { line: "", extra: "" };
  const idx = t.indexOf(" - ");
  if (idx === -1) return { line: t, extra: "" };
  return { line: t.slice(0, idx).trim(), extra: t.slice(idx + 3).trim() };
}

function combineDeliveryAddress(line: string, extra: string): string {
  const a = line.trim();
  const b = extra.trim();
  if (!a) return b;
  if (!b) return a;
  return `${a} - ${b}`;
}

/** Bloom — Almirante Brown 2005, Mar del Plata */
const BLOOM_COORDINATES = { lat: -38.0023, lng: -57.5575 } as const;
const DELIVERY_RADIUS_STRAIGHT_LINE_M = 300;
const WHATSAPP_COORDINATE_ORDERS = "5492231234567";

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

async function geocodeAddressGoogle(
  fullAddress: string,
  apiKey: string
): Promise<{ lat: number; lng: number } | null> {
  const q = `${fullAddress.trim()}, Mar del Plata, Argentina`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${encodeURIComponent(apiKey)}&region=AR`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status?: string;
    results?: { geometry?: { location?: { lat?: number; lng?: number } } }[];
  };
  if (data.status !== "OK" || !data.results?.length) return null;
  const loc = data.results[0]?.geometry?.location;
  if (typeof loc?.lat !== "number" || typeof loc?.lng !== "number") return null;
  return { lat: loc.lat, lng: loc.lng };
}

/** Solo `user_metadata` de la sesión (sin email ni campos del objeto IconUser). */
function prefillCheckoutFromUser(user: { user_metadata?: Record<string, unknown> }): {
  name: string;
  phone: string;
  addressLine: string;
  addressExtra: string;
  defaultAddressSaved: string;
} {
  const meta = user.user_metadata ?? {};
  const nameFromMeta =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    "";
  const phoneFromMeta = typeof meta.phone === "string" ? meta.phone.trim() : "";
  const da = typeof meta.default_address === "string" ? meta.default_address.trim() : "";
  const { line, extra } = splitSavedAddress(da);
  return {
    name: nameFromMeta,
    phone: phoneFromMeta,
    addressLine: line,
    addressExtra: extra,
    defaultAddressSaved: da,
  };
}

type UpsellVariant = "food" | "drink" | "pastry";

function upsellVariantFromCategoryName(name: string | null | undefined): UpsellVariant {
  const n = (name ?? "").toLowerCase();
  if (/(pasteler|factura|medialuna|dulce|torta|panific|desayuno|cookie|masa|brownie)/i.test(n)) return "pastry";
  if (/(cafeter|bebida|jugo|licuado|café|cafe|té|tea|smoothie|batido|gaseosa|bar\b)/i.test(n)) return "drink";
  return "food";
}

const UPSELL_PRIMARY: Record<UpsellVariant, string> = {
  food: "¿Querés sumar algo para tomar? Tenemos cafés, jugos y licuados 🥤",
  drink: "¿Querés acompañarlo con una factura o medialunas? 🥐",
  pastry: "¿Un café para acompañar? ☕",
};

const UPSELL_FOOTER =
  "O si querés ver otra categoría, cerrá este panel y elegí otra.";

/** Una sola vez por sesión de navegador: aviso suave para iniciar sesión. */
const SOFT_AUTH_SESSION_KEY = "bloom_chat_soft_auth_hint";

/** Post-login: restaurar carrito y abrir modal de encargo en /menu. */
const BLOOM_PENDING_CART_KEY = "bloom_pending_cart";
const BLOOM_PENDING_CHECKOUT_KEY = "bloom_pending_checkout";

function parsePendingCartLines(raw: string): CartLine[] | null {
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return null;
    const out: CartLine[] = [];
    for (const row of data) {
      if (row == null || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const lineId = typeof o.lineId === "string" ? o.lineId : "";
      const product_id = typeof o.product_id === "string" ? o.product_id : "";
      const name = typeof o.name === "string" ? o.name : "";
      const price = Number(o.price);
      const quantity = Number(o.quantity);
      const observations = typeof o.observations === "string" ? o.observations : "";
      if (!lineId || !product_id || !name || !Number.isFinite(price) || !Number.isFinite(quantity) || quantity < 1) {
        continue;
      }
      let variants: { name: string }[] | undefined;
      if (Array.isArray(o.variants)) {
        const v = o.variants.filter(
          (x): x is { name: string } =>
            x != null && typeof x === "object" && typeof (x as { name?: unknown }).name === "string"
        );
        if (v.length) variants = v.map((x) => ({ name: x.name }));
      }
      out.push({
        lineId,
        product_id,
        name,
        price,
        quantity,
        observations,
        ...(variants?.length ? { variants } : {}),
        productHadVariants: Boolean(o.productHadVariants),
      });
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

type ChatContext = {
  displayName: string;
  categoryId: string | null;
  productIds: string[] | null;
  fromHomeFeatured?: boolean;
};

function buildChoiceFromGroups(
  groups: ProductOptionGroup[],
  single: Record<string, string>,
  multi: Record<string, string[]>
): VariantChoice | null {
  const detail: { name: string }[] = [];
  const summaryParts: string[] = [];
  for (const g of groups) {
    if (g.max <= 1) {
      const v = single[g.name]?.trim() ?? "";
      if (g.min >= 1 && !v) return null;
      if (v) {
        summaryParts.push(v);
        detail.push({ name: `${g.name}: ${v}` });
      }
    } else {
      const arr = multi[g.name] ?? [];
      if (arr.length < g.min) return null;
      if (arr.length > g.max) return null;
      for (const v of arr) {
        detail.push({ name: `${g.name}: ${v}` });
        summaryParts.push(v);
      }
    }
  }
  if (!summaryParts.length && groups.some((g) => g.min >= 1)) return null;
  if (!summaryParts.length) return { summaryLabel: "", variants: [] };
  return { summaryLabel: summaryParts.join(" · "), variants: detail };
}

function ProductCard({
  product,
  added,
  isLoggedIn,
  onEncargar,
  onRemove,
  onLoginClick,
  onAuthClick,
}: {
  product: ProductRow;
  added: boolean;
  isLoggedIn: boolean;
  onEncargar: (observations: string, quantity: number, choice?: VariantChoice) => void;
  onRemove?: () => void;
  onLoginClick: () => void;
  onAuthClick?: () => void;
}) {
  const [observation, setObservation] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [pickOpen, setPickOpen] = useState(false);
  const [selectedFlat, setSelectedFlat] = useState("");
  const [groupSingle, setGroupSingle] = useState<Record<string, string>>({});
  const [groupMulti, setGroupMulti] = useState<Record<string, string[]>>({});

  const variantList = product.variants ?? [];
  const baseGroups = product.optionGroups ?? [];
  const injectedGroups = getInjectedOptionGroups(product);
  
  const groups = [...baseGroups];
  for (const ig of injectedGroups) {
    if (!groups.some(g => g.name === ig.name)) {
      groups.push(ig);
    }
  }
  const hasFlat = variantList.length > 0;
  const hasGroups = groups.length > 0;
  const needsPicker = hasFlat || hasGroups;

  const resetPicker = () => {
    setSelectedFlat("");
    setGroupSingle({});
    setGroupMulti({});
  };

  const handleEncargarClick = () => {
    if (needsPicker) {
      setPickOpen(true);
      resetPicker();
      return;
    }
    onEncargar(observation.trim(), quantity);
  };

  const handleConfirmFlat = () => {
    if (!selectedFlat) return;
    onEncargar(observation.trim(), quantity, {
      summaryLabel: selectedFlat,
      variants: [{ name: selectedFlat }],
    });
    setPickOpen(false);
    resetPicker();
  };

  const handleConfirmGroups = () => {
    const choice = buildChoiceFromGroups(groups, groupSingle, groupMulti);
    if (!choice) {
      toast.error("Completá las opciones obligatorias");
      return;
    }
    onEncargar(observation.trim(), quantity, choice);
    setPickOpen(false);
    resetPicker();
  };

  const toggleMulti = (groupName: string, opt: string, max: number) => {
    setGroupMulti((prev) => {
      const cur = prev[groupName] ?? [];
      if (cur.includes(opt)) {
        return { ...prev, [groupName]: cur.filter((x) => x !== opt) };
      }
      if (cur.length >= max) {
        toast.info(`Máximo ${max} opciones en ${groupName}`);
        return prev;
      }
      return { ...prev, [groupName]: [...cur, opt] };
    });
  };

  return (
    <div className="flex w-full flex-col gap-4 rounded-3xl bg-white p-5 text-center items-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.03] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="flex w-full flex-col items-center gap-4">
        <div className="flex w-full flex-col items-center py-0.5">
          <div className="flex flex-col items-center w-full">
            <div className="flex flex-col items-center justify-center w-full gap-1">
              {product.kind === 'oferta_del_dia' && (
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-1">🔥 Oferta del día</span>
              )}
              <h4 className="font-bold text-neutral-900 leading-[1.1] text-base">{product.name}</h4>
              {added && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                    <IconCheck className="h-3 w-3" strokeWidth={4} />
                  </span>
                  {onRemove && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onRemove(); }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-500 text-[10px] font-bold hover:bg-red-100 transition-all active:scale-95"
                    >
                      <IconX className="h-3 w-3" strokeWidth={3} />
                      Quitar
                    </button>
                  )}
                </div>
              )}
            </div>
            {product.description && (
              <p className="line-clamp-2 text-[11px] text-neutral-400 mt-1.5 leading-snug font-medium max-w-[80%] mx-auto">{product.description}</p>
            )}
          </div>
          <div className="mt-2">
            <span className="font-bold text-bloom-700 text-lg tracking-tight">{formatArs(Number(product.price))}</span>
          </div>
        </div>
      </div>

      {isLoggedIn ? (
        <div className="space-y-4">
          {pickOpen && needsPicker ? (
            <div className="space-y-5 border-t border-neutral-50 pt-5">
              {/* Opción Flat (ej. Sabores) */}
              {hasFlat && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Seleccioná una opción</p>
                  <div className="flex flex-wrap gap-2">
                    {variantList.map((v) => (
                      <button
                        key={v}
                        onClick={() => setSelectedFlat(v)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                          selectedFlat === v ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Grupos de Opciones */}
              {hasGroups && groups.map((g) => (
                <div key={g.name} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                      {g.name} {g.min > 0 && <span className="text-red-500">*</span>}
                    </p>
                    {g.max > 1 && <span className="text-[10px] font-bold text-neutral-300">Máx {g.max}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.options.map((opt) => {
                      const isSelected = g.max <= 1 ? groupSingle[g.name] === opt : (groupMulti[g.name] ?? []).includes(opt);
                      return (
                        <button
                          key={opt}
                          onClick={() => {
                            if (g.max <= 1) setGroupSingle(prev => ({ ...prev, [g.name]: opt }));
                            else toggleMulti(g.name, opt, g.max);
                          }}
                          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                            isSelected ? 'bg-neutral-900 text-white border-neutral-900 shadow-md' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setPickOpen(false); resetPicker(); }}
                  className="flex-1 py-3 text-[11px] font-bold text-neutral-400"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => { if (hasFlat) handleConfirmFlat(); else handleConfirmGroups(); }}
                  className="flex-[2] rounded-2xl bg-neutral-900 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl active:scale-95 transition-all"
                >
                  Confirmar selección
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 border-t border-neutral-50 pt-5">
              <div className="relative">
                <input
                  type="text"
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="¿Alguna aclaración? (sin cebolla, etc.)"
                  className="w-full rounded-2xl bg-neutral-50 border-none px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-neutral-100 outline-none placeholder:text-neutral-300"
                />
              </div>
              <div className="flex flex-col gap-3 w-full">
                <div className="flex items-center justify-between bg-neutral-50 p-2 rounded-2xl ring-1 ring-black/[0.03] w-full h-14">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-4">Cantidad</span>
                  <div className="flex items-center gap-4 mr-2">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center bg-white shadow-sm rounded-xl transition-all text-neutral-400 hover:text-neutral-900 border border-neutral-100"><IconMinus size={18} /></button>
                    <span className="w-6 text-center font-bold text-base text-neutral-900">{quantity}</span>
                    <button onClick={() => setQuantity(q => q + 1)} className="w-10 h-10 flex items-center justify-center bg-white shadow-sm rounded-xl transition-all text-neutral-400 hover:text-neutral-900 border border-neutral-100"><IconPlus size={18} /></button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleEncargarClick}
                  className="w-full h-14 rounded-2xl bg-[#7a765a] text-white text-xs font-black uppercase tracking-[0.2em] shadow-[0_10px_25px_-5px_rgba(122,118,90,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 hover:bg-[#6b674e]"
                >
                  <IconShoppingBag size={18} /> {added ? "SUMAR AL ENCARGO" : "AGREGAR AL ENCARGO"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border-t border-neutral-50 pt-5 flex gap-2">
          <button
            onClick={onAuthClick ?? onLoginClick}
            className="flex-1 py-3.5 rounded-2xl bg-neutral-900 text-white text-[11px] font-black uppercase tracking-[0.14em] shadow-xl active:scale-[0.98] transition-all"
          >
            Iniciar sesión
          </button>
          <button
            onClick={onLoginClick}
            className="flex-1 py-3.5 rounded-2xl bg-white border border-neutral-200 text-neutral-800 text-[11px] font-black uppercase tracking-[0.14em] active:scale-[0.98] transition-all"
          >
            Registrarse
          </button>
        </div>
      )}
    </div>
  );
}

export const BloomChat = forwardRef<BloomChatHandle>(function BloomChat(_props, ref) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<ChatContext | null>(null);
  const [contextKey, setContextKey] = useState(0);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [dailyOffersList, setDailyOffersList] = useState<ProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [introText, setIntroText] = useState("");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(() => new Set());

  const [encargoOpen, setEncargoOpen] = useState(false);
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  /** Calle y número (delivery). */
  const [checkoutAddressLine, setCheckoutAddressLine] = useState("");
  /** Piso, dpto, referencia (opcional). */
  const [checkoutAddressExtra, setCheckoutAddressExtra] = useState("");
  /** Texto de `user_metadata.default_address` al abrir encargo (solo muestra). */
  const [savedAddressFromProfile, setSavedAddressFromProfile] = useState("");
  /** Sin dirección guardada, o el usuario eligió "Usar otra dirección" → mostrar campos. */
  const [deliveryCustomAddressMode, setDeliveryCustomAddressMode] = useState(true);
  const [saveDefaultAddress, setSaveDefaultAddress] = useState(true);
  const [addressConfirmation, setAddressConfirmation] = useState<"yes" | "no">("yes");
  const [deliveryType, setDeliveryType] = useState<"local" | "delivery">("local");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash_on_delivery" | "bank_transfer" | "mercadopago"
  >("cash_on_delivery");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  /** Cuenta corriente – saldo pendiente del cliente logueado. */
  const [profileBalance, setProfileBalance] = useState<number>(0);
  /** El cliente eligió incluir pago de deuda CC en el checkout MP. */
  const [payDebt, setPayDebt] = useState(false);
  const [payDebtType, setPayDebtType] = useState<"total" | "parcial">("total");
  const [payDebtMonto, setPayDebtMonto] = useState("");

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showHistoryLink, setShowHistoryLink] = useState(false);
  const [softAuthHintVisible, setSoftAuthHintVisible] = useState(false);
  /** Solo con sesión: formulario de confirmación. */
  const [encargoCheckoutUnlocked, setEncargoCheckoutUnlocked] = useState(false);
  /** Sesión detectada al abrir el modal de encargo: mostrar mensaje de confirmación de datos. */
  const [encargoLoggedInPrefill, setEncargoLoggedInPrefill] = useState(false);
  const [checkoutSubmitAttempted, setCheckoutSubmitAttempted] = useState(false);
  /** Tras Encargar: sugerencia antes de mostrar «Ver encargo». */
  const [upsellVariant, setUpsellVariant] = useState<UpsellVariant | null>(null);
  /** Zona delivery (geocodigo + distancia recta vs Bloom). */
  const [deliveryZoneStatus, setDeliveryZoneStatus] = useState<
    "idle" | "checking" | "in_zone" | "out_of_zone" | "skipped_no_key"
  >("idle");
  const [deliveryZoneCheckedFor, setDeliveryZoneCheckedFor] = useState("");
  const deliveryZoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  /** Evita doble restauración (StrictMode / varios eventos de auth). */
  const pendingRestoreHandledRef = useRef(false);

  const persistCartAndGo = useCallback(
    (href: string) => {
      try {
        sessionStorage.setItem(BLOOM_PENDING_CART_KEY, JSON.stringify(cart));
        sessionStorage.setItem(BLOOM_PENDING_CHECKOUT_KEY, "true");
      } catch {
        toast.error("No se pudo guardar el encargo. Intentá de nuevo.");
        return;
      }
      router.push(href);
    },
    [cart, router],
  );

  const persistCartAndGoToRegistro = useCallback(() => persistCartAndGo("/registro?redirect=/menu"), [persistCartAndGo]);
  const persistCartAndGoToAuth = useCallback(() => persistCartAndGo("/auth?redirect=/menu"), [persistCartAndGo]);

  const cartCount = useMemo(() => cart.reduce((n, l) => n + l.quantity, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((s, l) => s + l.price * l.quantity, 0), [cart]);
  const deliveryAddressCombined = useMemo(
    () => combineDeliveryAddress(checkoutAddressLine, checkoutAddressExtra),
    [checkoutAddressLine, checkoutAddressExtra]
  );

  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

  useEffect(() => {
    if (deliveryZoneTimerRef.current) {
      clearTimeout(deliveryZoneTimerRef.current);
      deliveryZoneTimerRef.current = null;
    }

    if (!encargoOpen || deliveryType !== "delivery" || !googleMapsKey) {
      setDeliveryZoneStatus(googleMapsKey ? "idle" : "skipped_no_key");
      setDeliveryZoneCheckedFor("");
      return;
    }

    const addr = deliveryAddressCombined.trim();
    if (addr.length < 6) {
      setDeliveryZoneStatus("idle");
      setDeliveryZoneCheckedFor("");
      return;
    }

    deliveryZoneTimerRef.current = setTimeout(() => {
      void (async () => {
        setDeliveryZoneStatus("checking");
        try {
          const coords = await geocodeAddressGoogle(addr, googleMapsKey);
          if (!coords) {
            setDeliveryZoneStatus("in_zone");
            setDeliveryZoneCheckedFor(addr);
            return;
          }
          const m = haversineMeters(BLOOM_COORDINATES, coords);
          setDeliveryZoneCheckedFor(addr);
          setDeliveryZoneStatus(m <= DELIVERY_RADIUS_STRAIGHT_LINE_M ? "in_zone" : "out_of_zone");
        } catch (e) {
          console.error("[BloomChat] delivery zone", e);
          setDeliveryZoneStatus("in_zone");
          setDeliveryZoneCheckedFor(addr);
        }
      })();
    }, 650);

    return () => {
      if (deliveryZoneTimerRef.current) clearTimeout(deliveryZoneTimerRef.current);
    };
  }, [
    encargoOpen,
    deliveryType,
    deliveryAddressCombined,
    googleMapsKey,
  ]);

  const whatsappOutOfZoneHref = useMemo(() => {
    const text = `Hola! Quiero hacer un pedido a domicilio a ${deliveryAddressCombined.trim()}`;
    return `https://wa.me/${WHATSAPP_COORDINATE_ORDERS}?text=${encodeURIComponent(text)}`;
  }, [deliveryAddressCombined]);

  /** Con API key: no confirmar hasta tener chequeo `in_zone` para la dirección actual. */
  const deliveryGeoBlocksConfirm = useMemo(() => {
    if (deliveryType !== "delivery" || !googleMapsKey) return false;
    const full = deliveryAddressCombined.trim();
    if (full.length < 6) return false;
    if (deliveryZoneStatus === "checking" || deliveryZoneStatus === "idle") return true;
    if (deliveryZoneStatus === "out_of_zone") return true;
    if (deliveryZoneStatus === "in_zone" && deliveryZoneCheckedFor !== full) return true;
    return false;
  }, [
    deliveryType,
    googleMapsKey,
    deliveryAddressCombined,
    deliveryZoneStatus,
    deliveryZoneCheckedFor,
  ]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  };

  useEffect(() => {
    if (!open) return;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [open]);

  useEffect(() => {
    scrollToBottom();
  }, [cart, encargoOpen, successMessage, softAuthHintVisible, upsellVariant]);

  // Cargar OFERTAS DEL DÍA una vez al abrir el chat
  useEffect(() => {
    if (!open) return;
    const fetchOffers = async () => {
      try {
        const { data } = await supabase
          .from("daily_promotions")
          .select("id,name,price")
          .eq("active", true)
          .order("created_at", { ascending: true });
        
        if (data) {
          const mapped = data.map(p => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            kind: 'oferta_del_dia'
          } as ProductRow));
          setDailyOffersList(mapped);
        }
      } catch (e) {
        console.error("Error loading daily offers from daily_promotions:", e);
      }
    };
    void fetchOffers();
  }, [open, supabase]);

  // Cargar PRODUCTOS DE LA CATEGORÍA
  useEffect(() => {
    if (!open || !context) return;
    
    // Si no hay categoría seleccionada, no cargar productos extra (solo mostrar ofertas arriba)
    const hasScope = (context.productIds?.length ?? 0) > 0 || !!context.categoryId;
    if (!hasScope) {
      setProducts([]);
      return;
    }

    let cancelled = false;
    const loadCategoryProducts = async () => {
      setLoadingProducts(true);
      try {
        let q = supabase
          .from("products")
          .select("id,name,description,price,image_url,category_id,kind,options, categories(name)")
          .eq("active", true)
          .neq("kind", "oferta_del_dia");

        if (context.productIds?.length) {
          q = q.in("id", context.productIds);
        } else if (context.categoryId) {
          q = q.eq("category_id", context.categoryId);
        }

        const { data: prods, error: err } = await q.order("name");
        if (cancelled) return;
        if (err) throw err;

        const mapped = (prods || []).map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || null,
          image_url: p.image_url || null,
          price: Number(p.price),
          kind: p.kind || null,
          ...parseProductOptionsRow(p.options),
        } as ProductRow));

        setProducts(mapped);
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      } catch (e) {
        console.error("Error loading category products:", e);
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    };

    void loadCategoryProducts();
    return () => { cancelled = true; };
  }, [open, context, supabase]);

  useEffect(() => {
    if (!encargoOpen) return;
    let cancelled = false;
    setCheckoutSubmitAttempted(false);
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      const user = session?.user;
      if (user) {
        setEncargoCheckoutUnlocked(true);
        setEncargoLoggedInPrefill(true);
        const p = prefillCheckoutFromUser(user);
        setCheckoutName(p.name);
        setCheckoutPhone(p.phone);
        const saved = p.defaultAddressSaved.trim();
        setSavedAddressFromProfile(saved);
        if (saved) {
          setDeliveryCustomAddressMode(false);
          setCheckoutAddressLine(p.addressLine);
          setCheckoutAddressExtra(p.addressExtra);
        } else {
          setDeliveryCustomAddressMode(true);
          setCheckoutAddressLine("");
          setCheckoutAddressExtra("");
        }
        setSaveDefaultAddress(true);

        // Cargar saldo de cuenta corriente
        const { data: prof, error: profErr } = await supabase.from("profiles").select("balance").eq("id", user.id).single();
        console.log("[BloomChat] CC balance load:", { userId: user.id, prof, profErr });
        if (!cancelled && prof && Number(prof.balance) > 0) {
          setProfileBalance(Number(prof.balance));
          setPayDebtMonto(String(prof.balance));
        } else if (!cancelled) {
          setProfileBalance(0);
        }
      } else {
        setEncargoCheckoutUnlocked(false);
        setEncargoLoggedInPrefill(false);
        setSavedAddressFromProfile("");
        setDeliveryCustomAddressMode(true);
        setCheckoutAddressLine("");
        setCheckoutAddressExtra("");
        setProfileBalance(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encargoOpen, supabase]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const user = session?.user;
      if (user) {
        setSoftAuthHintVisible(false);
        setEncargoCheckoutUnlocked(true);
        setEncargoLoggedInPrefill(true);
        const p = prefillCheckoutFromUser(user);
        setCheckoutName(p.name);
        setCheckoutPhone(p.phone);
        const saved = p.defaultAddressSaved.trim();
        setSavedAddressFromProfile(saved);
        if (saved) {
          setDeliveryCustomAddressMode(false);
          setCheckoutAddressLine(p.addressLine);
          setCheckoutAddressExtra(p.addressExtra);
        } else {
          setDeliveryCustomAddressMode(true);
          setCheckoutAddressLine("");
          setCheckoutAddressExtra("");
        }
        // Cargar saldo CC tras cambio de auth
        supabase.from("profiles").select("balance").eq("id", user.id).single().then(({ data: prof }) => {
          if (prof && Number(prof.balance) > 0) {
            setProfileBalance(Number(prof.balance));
            setPayDebtMonto(String(prof.balance));
          } else {
            setProfileBalance(0);
          }
        });
      } else {
        setEncargoCheckoutUnlocked(false);
        setEncargoLoggedInPrefill(false);
        setSavedAddressFromProfile("");
        setDeliveryCustomAddressMode(true);
        setCheckoutAddressLine("");
        setCheckoutAddressExtra("");
        setProfileBalance(0);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  /** Tras login desde el encargo: restaurar carrito, abrir modal y limpiar sessionStorage. */
  useEffect(() => {
    const tryRestorePendingCheckout = async () => {
      if (pendingRestoreHandledRef.current) return;
      if (typeof window === "undefined") return;
      if (sessionStorage.getItem(BLOOM_PENDING_CHECKOUT_KEY) !== "true") return;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      pendingRestoreHandledRef.current = true;
      const raw = sessionStorage.getItem(BLOOM_PENDING_CART_KEY);
      sessionStorage.removeItem(BLOOM_PENDING_CHECKOUT_KEY);
      sessionStorage.removeItem(BLOOM_PENDING_CART_KEY);

      const lines = raw ? parsePendingCartLines(raw) ?? [] : [];
      if (lines.length > 0) {
        setCart(lines);
        setAddedProductIds(new Set(lines.filter((l) => !l.productHadVariants).map((l) => l.product_id)));
      }

      const p = prefillCheckoutFromUser(session.user);
      setCheckoutName(p.name);
      setCheckoutPhone(p.phone);
      const saved = p.defaultAddressSaved.trim();
      setSavedAddressFromProfile(saved);
      if (saved) {
        setDeliveryCustomAddressMode(false);
        setCheckoutAddressLine(p.addressLine);
        setCheckoutAddressExtra(p.addressExtra);
      } else {
        setDeliveryCustomAddressMode(true);
        setCheckoutAddressLine("");
        setCheckoutAddressExtra("");
      }
      setSaveDefaultAddress(true);
      setAddressConfirmation("yes");
      setEncargoCheckoutUnlocked(true);
      setEncargoLoggedInPrefill(true);
      // Cargar saldo CC tras restaurar checkout
      supabase.from("profiles").select("balance").eq("id", session.user.id).single().then(({ data: prof }) => {
        if (prof && Number(prof.balance) > 0) {
          setProfileBalance(Number(prof.balance));
          setPayDebtMonto(String(prof.balance));
        } else {
          setProfileBalance(0);
        }
      });
      setSoftAuthHintVisible(false);
      setOpen(true);
      setEncargoOpen(true);
      setCheckoutSubmitAttempted(false);
    };

    void tryRestorePendingCheckout();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") &&
        session?.user
      ) {
        void tryRestorePendingCheckout();
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      if (cart.length === 0) {
        if (!cancelled) setSoftAuthHintVisible(false);
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user) {
        setSoftAuthHintVisible(false);
        return;
      }
      if (typeof window !== "undefined" && sessionStorage.getItem(SOFT_AUTH_SESSION_KEY) === "1") {
        return;
      }
      if (typeof window !== "undefined") sessionStorage.setItem(SOFT_AUTH_SESSION_KEY, "1");
      setSoftAuthHintVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, cart.length, supabase]);

  /** Nueva sesión desde el FAB: vacía carrito y formularios. */
  const resetForContext = useCallback(() => {
    setCart([]);
    setAddedProductIds(new Set());
    setEncargoOpen(false);
    setSuccessMessage(null);
    setShowHistoryLink(false);
    setCheckoutName("");
    setCheckoutPhone("");
    setCheckoutAddressLine("");
    setCheckoutAddressExtra("");
    setSavedAddressFromProfile("");
    setDeliveryCustomAddressMode(true);
    setSaveDefaultAddress(true);
    setAddressConfirmation("yes");
    setDeliveryType("local");
    setPaymentMethod("cash_on_delivery");
    setEncargoCheckoutUnlocked(false);
    setEncargoLoggedInPrefill(false);
    setCheckoutSubmitAttempted(false);
    setUpsellVariant(null);
    setPayDebt(false);
    setPayDebtType("total");
    setPayDebtMonto("");
  }, []);

  /** Cambiar categoría / «Ver categorías»: solo cierra overlays y upsell; mantiene carrito y contexto de checkout. */
  const resetChatUiPreservingCart = useCallback(() => {
    setEncargoOpen(false);
    setSuccessMessage(null);
    setShowHistoryLink(false);
    setUpsellVariant(null);
    setDeliveryZoneStatus("idle");
    setDeliveryZoneCheckedFor("");
  }, []);

  const addLine = useCallback((p: ProductRow, observations: string, quantity: number, choice?: VariantChoice) => {
    const lineId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `line-${Date.now()}-${Math.random()}`;
    const hadVariants = productHasConfigurableOptions(p);
    if (hadVariants) {
      if (!choice) {
        toast.error("Completá las opciones del producto");
        return;
      }
    }
    const displayName = choice?.summaryLabel?.trim()
      ? `${p.name} (${choice.summaryLabel.trim()})`
      : p.name;
    const variantsPayload = choice?.variants?.length ? choice.variants : undefined;
    setCart((prev) => [
      ...prev,
      {
        lineId,
        product_id: p.id,
        name: displayName,
        price: Number(p.price),
        quantity: quantity || 1,
        observations,
        ...(variantsPayload ? { variants: variantsPayload } : {}),
        productHadVariants: hadVariants,
      },
    ]);
    setAddedProductIds((prev) => {
      if (hadVariants) return prev;
      return new Set(prev).add(p.id);
    });
    setUpsellVariant(upsellVariantFromCategoryName(p.category_name ?? null));
  }, []);

  const submitOrder = useCallback(async () => {
    const name = checkoutName.trim();
    const phone = checkoutPhone.trim();
    const address = deliveryAddressCombined.trim();
    setCheckoutSubmitAttempted(true);
    if (!name || !phone) {
      return;
    }
    if (deliveryType === "delivery" && !checkoutAddressLine.trim()) {
      toast.error("Ingresá la calle y el número de entrega");
      return;
    }
    if (deliveryType === "delivery" && deliveryGeoBlocksConfirm) {
      if (deliveryZoneStatus === "out_of_zone" && deliveryZoneCheckedFor === address) {
        toast.error("Esta dirección queda fuera de la zona de delivery web. Coordiná por WhatsApp.");
        return;
      }
      toast.error("Esperá la verificación de la dirección o corregila antes de confirmar.");
      return;
    }

    setSubmittingOrder(true);

    // Calcular monto de deuda a incluir (solo con MercadoPago)
    let debtAmount = 0;
    if (paymentMethod === "mercadopago" && profileBalance > 0 && payDebt) {
      if (payDebtType === "total") {
        debtAmount = profileBalance;
      } else {
        const parsed = parseFloat(payDebtMonto);
        if (!isNaN(parsed) && parsed > 0 && parsed <= profileBalance) {
          debtAmount = parsed;
        } else if (!isNaN(parsed) && parsed > profileBalance) {
          debtAmount = profileBalance;
        }
      }
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const loggedIn = !!session?.access_token;

      const res = await fetch("/api/bloom-chat/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({
            product_id: c.product_id,
            name: c.name,
            price: c.price,
            quantity: c.quantity,
            ...(c.observations ? { observations: c.observations } : {}),
            ...(c.variants?.length ? { variants: c.variants } : {}),
          })),
          customer_name: name,
          customer_phone: phone,
          delivery_type: deliveryType,
          payment_method: paymentMethod,
          ...(debtAmount > 0 ? { debt_payment_amount: debtAmount } : {}),
          ...(deliveryType === "delivery"
            ? {
                delivery_address: address,
                address_confirmed:
                  deliveryCustomAddressMode ? addressConfirmation === "yes" : true,
              }
            : {}),
          ...(session?.access_token ? { access_token: session.access_token } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
        order_id?: string;
      };
      if (!res.ok) {
        toast.error(data.error || "Error al enviar el encargo");
        return;
      }

      if (
        session?.user &&
        saveDefaultAddress &&
        deliveryType === "delivery" &&
        address.length > 0
      ) {
        const { error: addrErr } = await supabase.auth.updateUser({
          data: { default_address: address },
        });
        if (addrErr) console.error("[BloomChat] updateUser default_address", addrErr);
      }

      if (paymentMethod === "mercadopago") {
        const orderId = data.order_id?.trim();
        if (!orderId) {
          toast.error("No se pudo iniciar el pago. Revisá la configuración del servidor.");
          return;
        }

        const mpItems = cart.map((c) => ({
              title: c.name,
              quantity: c.quantity,
              unit_price: c.price,
            }));
        if (debtAmount > 0) {
          mpItems.push({ title: "Pago Cuenta Corriente", quantity: 1, unit_price: debtAmount });
        }

        const prefRes = await fetch("/api/payments/create-preference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: orderId,
            items: mpItems,
            customer: { name, phone },
            ...(debtAmount > 0 ? { debt_payment_amount: debtAmount } : {}),
          }),
        });
        const prefData = (await prefRes.json().catch(() => ({}))) as {
          error?: string;
          init_point?: string;
        };
        if (!prefRes.ok || !prefData.init_point) {
          toast.error(prefData.error || "No se pudo abrir Mercado Pago");
          return;
        }

        setEncargoOpen(false);
        setEncargoLoggedInPrefill(false);
        setUpsellVariant(null);
        setCart([]);
        setAddedProductIds(new Set());
        setCheckoutName("");
        setCheckoutPhone("");
        setCheckoutAddressLine("");
        setCheckoutAddressExtra("");
        setAddressConfirmation("yes");
        setDeliveryType("local");
        setPaymentMethod("cash_on_delivery");
        setPayDebt(false);
        setPayDebtType("total");
        setPayDebtMonto("");
        setContextKey((k) => k + 1);
        window.location.assign(prefData.init_point);
        return;
      }

      setEncargoOpen(false);
      setEncargoLoggedInPrefill(false);
      setUpsellVariant(null);
      setSuccessMessage(
        paymentMethod === "bank_transfer"
          ? `Te enviamos los datos de transferencia por WhatsApp al ${phone}.`
          : "Encargo enviado, te esperamos en Bloom!"
      );
      setShowHistoryLink(!loggedIn);
      setCart([]);
      setAddedProductIds(new Set());
      setCheckoutName("");
      setCheckoutPhone("");
      setCheckoutAddressLine("");
      setCheckoutAddressExtra("");
      setAddressConfirmation("yes");
      setDeliveryType("local");
      setPaymentMethod("cash_on_delivery");
      setPayDebt(false);
      setPayDebtType("total");
      setPayDebtMonto("");
      setContextKey((k) => k + 1);
      toast.success("Listo");
    } catch (e) {
      console.error(e);
      toast.error("Error de red");
    } finally {
      setSubmittingOrder(false);
    }
  }, [
    cart,
    checkoutName,
    checkoutPhone,
    checkoutAddressLine,
    checkoutAddressExtra,
    deliveryAddressCombined,
    deliveryType,
    addressConfirmation,
    paymentMethod,
    saveDefaultAddress,
    supabase,
    googleMapsKey,
    deliveryZoneStatus,
    deliveryZoneCheckedFor,
    deliveryGeoBlocksConfirm,
    deliveryCustomAddressMode,
    profileBalance,
    payDebt,
    payDebtType,
    payDebtMonto,
  ]);

  const openFabChat = useCallback(() => {
    resetForContext();
    setContext({ displayName: "Bloom", categoryId: null, productIds: null });
    setIntroText(genericIntro());
    setProducts([]);
    setContextKey((k) => k + 1);
    setOpen(true);
  }, [resetForContext]);

  const resumeChat = useCallback(() => {
    setOpen(true);
  }, []);

  const closeChatKeepCart = useCallback(() => {
    setEncargoOpen(false);
    setOpen(false);
    setUpsellVariant(null);
  }, []);

  const closeChatAndGoToMenu = useCallback(() => {
    closeChatKeepCart();
    router.push("/menu");
  }, [closeChatKeepCart, router]);

  const openWithProductEncargado = useCallback(
    async (productId: string) => {
      const { data: row, error } = await supabase
        .from("products")
        .select("id,name,description,price,category_id,options, categories(name)")
        .eq("id", productId)
        .eq("active", true)
        .maybeSingle();
      if (error || !row) {
        toast.error("No encontramos ese producto");
        return;
      }
      const raw = row as Record<string, unknown>;
      const c = raw.categories as { name?: string } | { name?: string }[] | null | undefined;
      const categoryName = Array.isArray(c)
        ? typeof c[0]?.name === "string"
          ? c[0].name
          : "Menú"
        : typeof c?.name === "string"
          ? c.name
          : "Menú";
      const productRow: ProductRow = {
        id: raw.id as string,
        name: raw.name as string,
        description: (raw.description as string | null) ?? null,
        price: Number(raw.price),
        category_id: (raw.category_id as string | null) ?? null,
        category_name: categoryName,
        ...parseProductOptionsRow(raw.options),
      };
      resetForContext();
      setContext({
        displayName: categoryName,
        categoryId: (raw.category_id as string | null) ?? null,
        productIds: null,
      });
      setIntroText(categoryIntro(categoryName));
      setContextKey((k) => k + 1);
      setOpen(true);
      if (productHasConfigurableOptions(productRow)) {
        toast.info("Elegí sabor u opción en la lista");
        return;
      }
      addLine(productRow, "", 1);
    },
    [addLine, resetForContext, supabase]
  );

  useImperativeHandle(
    ref,
    () => ({
      openWithCategoryMessage: (opts: OpenCategoryOpts) => {
        resetChatUiPreservingCart();
        const productIds = opts.productIds?.length ? opts.productIds : null;
        setContext({
          displayName: opts.displayName,
          categoryId: opts.categoryId ?? null,
          productIds,
          fromHomeFeatured: opts.fromHomeFeatured === true,
        });
        setIntroText(categoryIntro(opts.displayName));
        setContextKey((k) => k + 1);
        setOpen(true);
        setAddedProductIds(
          new Set(cart.filter((l) => !l.productHadVariants).map((l) => l.product_id))
        );
      },
      openChat: openFabChat,
      openWithProductEncargado,
    }),
    [openFabChat, openWithProductEncargado, resetChatUiPreservingCart, cart]
  );

  const closeModal = () => {
    setOpen(false);
    setContext(null);
    setEncargoOpen(false);
    setSuccessMessage(null);
    setShowHistoryLink(false);
    setEncargoCheckoutUnlocked(false);
    setEncargoLoggedInPrefill(false);
    setCheckoutSubmitAttempted(false);
    setUpsellVariant(null);
  };

  const showProductGrid =
    context &&
    ((context.productIds?.length ?? 0) > 0 || !!context.categoryId) &&
    (loadingProducts || products.length > 0);

  const productListKey = `${contextKey}-${context?.categoryId ?? ""}-${context?.productIds?.join(",") ?? ""}`;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => {
            if (cart.length > 0 && context) resumeChat();
            else openFabChat();
          }}
          className="fixed bottom-6 right-6 z-[100] relative flex h-14 w-14 items-center justify-center rounded-full bg-[#7a765a] text-white shadow-[0_10px_40px_-8px_rgba(45,74,62,0.55)] ring-2 ring-white/30 transition hover:bg-[#5f5c46] hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#c4b896]"
          aria-label={
            cartCount > 0
              ? `Abrir encargo Bloom, ${cartCount} productos en el carrito`
              : "Abrir encargo Bloom"
          }
        >
          <IconMessageCircle className="h-7 w-7" strokeWidth={2} />
          {cartCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#c4b896] px-1 text-[10px] font-black tabular-nums text-[#1a3028] ring-2 ring-white">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          ) : null}
        </button>
      )}

      {encargoOpen && (
        <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[#e8e4dc] bg-[#f7f5ef] shadow-2xl sm:max-h-[85vh] sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bloom-encargo-title"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#e0dcd4] px-4 py-3">
              <h2 id="bloom-encargo-title" className="font-black text-neutral-900">
                Tu encargo
              </h2>
              <button
                type="button"
                onClick={() => setEncargoOpen(false)}
                className="rounded-lg p-1 text-neutral-500 hover:bg-black/5"
                aria-label="Cerrar"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                              <ul className="space-y-3 text-sm">
                {cart.map((line) => (
                  <li key={line.lineId} className="rounded-xl border border-[#d4cfc4] bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                            <p className="font-bold text-neutral-900 line-clamp-2">
                                {line.name}
                            </p>
                            {line.observations ? (
                                <p className="mt-1 text-xs text-neutral-600">Obs.: {line.observations}</p>
                            ) : null}
                            <p className="mt-1 font-semibold text-[#2d4a3e]">{formatArs(line.price * line.quantity)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#f5f2eb] rounded-lg p-1 shrink-0 border border-[#e0dcd4]">
                            <button 
                                onClick={() => {
                                    setCart(prev => prev.map(l => l.lineId === line.lineId ? { ...l, quantity: Math.max(0, l.quantity - 1) } : l).filter(l => l.quantity > 0));
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-md bg-white text-[#2d4a3e] shadow-sm hover:bg-neutral-50 active:scale-90 transition-all font-black"
                            >
                                −
                            </button>
                            <span className="w-6 text-center font-black text-xs">{line.quantity}</span>
                            <button 
                                onClick={() => {
                                    setCart(prev => prev.map(l => l.lineId === line.lineId ? { ...l, quantity: l.quantity + 1 } : l));
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-md bg-white text-[#2d4a3e] shadow-sm hover:bg-neutral-50 active:scale-90 transition-all font-black"
                            >
                                +
                            </button>
                        </div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-[#e0dcd4] pt-3 text-base font-black text-[#2d4a3e]">
                Total: {formatArs(cartTotal)}
              </p>

              {!encargoCheckoutUnlocked ? (
                <div className="mt-6 space-y-3 border-t border-[#e0dcd4] pt-4">
                  <p className="text-sm font-medium leading-relaxed text-neutral-800">
                    Para confirmar tu encargo necesitás una cuenta en el Club Bloom.
                  </p>
                  <button
                    type="button"
                    onClick={persistCartAndGoToRegistro}
                    className="inline-flex w-full min-h-[48px] items-center justify-center rounded-xl bg-[#2d4a3e] px-4 py-3 text-center text-sm font-black text-white shadow hover:bg-[#1f342c] sm:max-w-md sm:mx-auto"
                  >
                    Registrate gratis →
                  </button>
                </div>
              ) : (
              <div className="mt-6 space-y-3 border-t border-[#e0dcd4] pt-4">
                {encargoLoggedInPrefill ? (
                  <p className="text-sm font-semibold leading-snug text-[#2d4a3e]">
                    Confirmamos estos datos para tu encargo:
                  </p>
                ) : (
                  <p className="text-xs font-bold uppercase text-neutral-500">Datos para tu encargo</p>
                )}
                <div>
                  <label className="text-xs font-bold text-neutral-500">Nombre</label>
                  <input
                    value={checkoutName}
                    onChange={(e) => {
                      setCheckoutName(e.target.value);
                      if (checkoutSubmitAttempted) setCheckoutSubmitAttempted(false);
                    }}
                    className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm ${
                      checkoutSubmitAttempted && !checkoutName.trim()
                        ? "border-red-400"
                        : "border-[#d4cfc4]"
                    }`}
                    autoComplete="name"
                    required
                  />
                  {checkoutSubmitAttempted && !checkoutName.trim() ? (
                    <p className="mt-1 text-xs text-red-600">Campo requerido</p>
                  ) : null}
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-500">Teléfono</label>
                  <input
                    value={checkoutPhone}
                    onChange={(e) => {
                      setCheckoutPhone(e.target.value);
                      if (checkoutSubmitAttempted) setCheckoutSubmitAttempted(false);
                    }}
                    placeholder={!checkoutPhone.trim() ? "Tu teléfono" : undefined}
                    className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm ${
                      checkoutSubmitAttempted && !checkoutPhone.trim()
                        ? "border-red-400"
                        : "border-[#d4cfc4]"
                    }`}
                    autoComplete="tel"
                    required
                  />
                  {checkoutSubmitAttempted && !checkoutPhone.trim() ? (
                    <p className="mt-1 text-xs text-red-600">Campo requerido</p>
                  ) : null}
                </div>
                <fieldset className="space-y-2">
                  <legend className="text-xs font-bold text-neutral-500">Entrega</legend>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#d4cfc4] bg-white px-3 py-2">
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryType === "local"}
                      onChange={() => {
                        setDeliveryType("local");
                        setAddressConfirmation("yes");
                        setDeliveryZoneStatus(googleMapsKey ? "idle" : "skipped_no_key");
                        setDeliveryZoneCheckedFor("");
                      }}
                      className="accent-[#2d4a3e]"
                    />
                    <span className="text-sm font-medium">Retiro en local</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#d4cfc4] bg-white px-3 py-2">
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryType === "delivery"}
                      onChange={() => {
                        setDeliveryType("delivery");
                        setAddressConfirmation("yes");
                        setDeliveryZoneStatus(googleMapsKey ? "idle" : "skipped_no_key");
                        setDeliveryZoneCheckedFor("");
                      }}
                      className="accent-[#2d4a3e]"
                    />
                    <span className="text-sm font-medium">Delivery</span>
                  </label>
                </fieldset>
                {deliveryType === "delivery" && (
                  <div className="space-y-3">
                    {savedAddressFromProfile.trim() && !deliveryCustomAddressMode ? (
                      <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-3 py-3 text-sm text-neutral-800">
                        <p className="flex items-start gap-2 leading-snug">
                          <IconCheck
                            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                            strokeWidth={2.5}
                            aria-hidden
                          />
                          <span>
                            <span className="font-semibold text-emerald-900">Tu dirección habitual:</span>{" "}
                            <span className="font-medium text-neutral-900">{savedAddressFromProfile}</span>
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setDeliveryCustomAddressMode(true);
                            setCheckoutAddressLine("");
                            setCheckoutAddressExtra("");
                            setAddressConfirmation("yes");
                            setDeliveryZoneStatus(googleMapsKey ? "idle" : "skipped_no_key");
                            setDeliveryZoneCheckedFor("");
                            if (checkoutSubmitAttempted) setCheckoutSubmitAttempted(false);
                          }}
                          className="mt-2.5 text-xs font-bold text-[#2d4a3e] underline underline-offset-2 hover:text-[#1f342c]"
                        >
                          Usar otra dirección
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="text-xs font-bold text-neutral-500">Dirección (calle y número)</label>
                          <input
                            type="text"
                            value={checkoutAddressLine}
                            onChange={(e) => {
                              setCheckoutAddressLine(e.target.value);
                              if (checkoutSubmitAttempted) setCheckoutSubmitAttempted(false);
                            }}
                            className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm ${
                              checkoutSubmitAttempted && !checkoutAddressLine.trim()
                                ? "border-red-400"
                                : "border-[#d4cfc4]"
                            }`}
                            autoComplete="street-address"
                            placeholder="Ej. Av. Independencia 1900"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-neutral-500">
                            Piso / Dpto / Referencia (opcional)
                          </label>
                          <input
                            type="text"
                            value={checkoutAddressExtra}
                            onChange={(e) => {
                              setCheckoutAddressExtra(e.target.value);
                              if (checkoutSubmitAttempted) setCheckoutSubmitAttempted(false);
                            }}
                            className="mt-1 w-full rounded-xl border border-[#d4cfc4] bg-white px-3 py-2 text-sm"
                            autoComplete="off"
                            placeholder="Ej. Piso 3, Of. 12 · Frente a Tribunales"
                          />
                        </div>
                        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[#d4cfc4] bg-white px-3 py-2">
                          <input
                            type="checkbox"
                            checked={saveDefaultAddress}
                            onChange={(e) => setSaveDefaultAddress(e.target.checked)}
                            className="accent-[#2d4a3e] mt-0.5"
                          />
                          <span className="text-sm font-medium text-neutral-800">
                            Guardar como mi dirección habitual
                          </span>
                        </label>
                        <div>
                          <label htmlFor="address-confirm" className="text-xs font-bold text-neutral-500">
                            ¿Confirmás la dirección?
                          </label>
                          <select
                            id="address-confirm"
                            value={addressConfirmation}
                            onChange={(e) => setAddressConfirmation(e.target.value === "no" ? "no" : "yes")}
                            className="mt-1 w-full rounded-xl border border-[#d4cfc4] bg-white px-3 py-2 text-sm font-medium"
                          >
                            <option value="yes">Sí</option>
                            <option value="no">No</option>
                          </select>
                          {addressConfirmation === "no" ? (
                            <p className="mt-1 text-xs text-neutral-600">Editá la dirección arriba si hace falta.</p>
                          ) : null}
                        </div>
                      </>
                    )}
                    {googleMapsKey && deliveryAddressCombined.trim().length >= 6 ? (
                      <div className="text-xs text-neutral-600">
                        {deliveryZoneStatus === "checking" ? (
                          <p className="flex items-center gap-2 font-medium text-[#2d4a3e]">
                            <IconLoader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                            Verificando zona de delivery…
                          </p>
                        ) : null}
                        {deliveryZoneStatus === "in_zone" &&
                        deliveryZoneCheckedFor === deliveryAddressCombined.trim() ? (
                          <p className="font-medium text-emerald-800">✓ Dentro de la zona de delivery cercana.</p>
                        ) : null}
                      </div>
                    ) : null}
                    {deliveryZoneStatus === "out_of_zone" &&
                    deliveryZoneCheckedFor === deliveryAddressCombined.trim() &&
                    googleMapsKey ? (
                      <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950">
                        <p className="font-semibold leading-snug">
                          La dirección está fuera de nuestra zona de delivery cercana. Por favor coordiná tu pedido
                          directamente por WhatsApp:
                        </p>
                        <a
                          href={whatsappOutOfZoneHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[#25D366] px-3 py-2.5 text-center text-xs font-black uppercase tracking-wide text-white hover:bg-[#1fb855]"
                        >
                          WhatsApp
                        </a>
                      </div>
                    ) : null}
                  </div>
                )}
                <fieldset className="space-y-2 border-t border-[#e0dcd4] pt-4">
                  <legend className="text-xs font-bold text-neutral-500">Forma de pago</legend>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#d4cfc4] bg-white px-3 py-2">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "mercadopago"}
                      onChange={() => setPaymentMethod("mercadopago")}
                      className="accent-[#2d4a3e]"
                    />
                    <span className="text-sm font-medium">💳 Pagar con MercadoPago</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#d4cfc4] bg-white px-3 py-2">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "cash_on_delivery"}
                      onChange={() => setPaymentMethod("cash_on_delivery")}
                      className="accent-[#2d4a3e]"
                    />
                    <span className="text-sm font-medium">💵 Pago contra entrega</span>
                  </label>
                </fieldset>

                {/* Cuenta Corriente – pago de saldo pendiente */}
                {paymentMethod === "mercadopago" && profileBalance > 0 && (
                  <div className="mt-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                    <h3 className="text-sm font-black text-emerald-900 mb-1.5 flex items-center gap-2">
                       Saldo Pendiente: {formatArs(profileBalance)}
                    </h3>
                    <p className="text-xs text-emerald-800/80 mb-3 leading-relaxed">
                      Tu cuenta corriente tiene un saldo pendiente. Podés sumarlo a este pago.
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={payDebt}
                        onChange={(e) => setPayDebt(e.target.checked)}
                        className="accent-emerald-600 w-4 h-4 rounded"
                      />
                      <span className="text-sm font-bold text-emerald-900">
                        Sí, quiero abonar mi saldo pendiente
                      </span>
                    </label>
                    {payDebt && (
                      <div className="pl-6 space-y-2 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="debtType"
                            value="total"
                            checked={payDebtType === "total"}
                            onChange={() => { setPayDebtType("total"); setPayDebtMonto(String(profileBalance)); }}
                            className="accent-emerald-600"
                          />
                          <span className="text-sm font-medium text-emerald-900">
                            Total ({formatArs(profileBalance)})
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="debtType"
                            value="parcial"
                            checked={payDebtType === "parcial"}
                            onChange={() => setPayDebtType("parcial")}
                            className="accent-emerald-600"
                          />
                          <span className="text-sm font-medium text-emerald-900">Monto parcial</span>
                        </label>
                        {payDebtType === "parcial" && (
                          <div className="mt-1.5">
                            <input
                              type="number"
                              min={1}
                              max={profileBalance}
                              value={payDebtMonto}
                              onChange={(e) => setPayDebtMonto(e.target.value)}
                              className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-400/30"
                              placeholder="Monto a abonar..."
                            />
                          </div>
                        )}
                        <p className="text-[11px] text-emerald-700/60 font-medium mt-1">
                          Total del pago:{" "}
                          <strong className="text-emerald-900">
                            {formatArs(
                              cartTotal +
                                (payDebtType === "total"
                                  ? profileBalance
                                  : Math.min(parseFloat(payDebtMonto) || 0, profileBalance))
                            )}
                          </strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}
            </div>

            <div className="shrink-0 border-t border-[#e0dcd4] bg-[#f7f5ef] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {encargoCheckoutUnlocked ? (
                <button
                  type="button"
                  disabled={submittingOrder || deliveryGeoBlocksConfirm}
                  onClick={() => void submitOrder()}
                  className="w-full rounded-xl bg-[#7a765a] px-4 py-3 text-sm font-black uppercase text-white hover:bg-[#5f5c46] disabled:opacity-50"
                >
                  {submittingOrder ? <IconLoader2 className="mx-auto h-5 w-5 animate-spin" /> : "Confirmar encargo"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[190] flex items-stretch justify-start bg-[#f7f5ef] md:items-center md:justify-center md:bg-black/50 md:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bloom-chat-title"
        >
          <div className="flex h-[94%] mt-auto w-full max-w-full flex-col overflow-hidden bg-[#f7f5ef] rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:mt-0 md:h-[85vh] md:max-h-[85vh] md:max-w-[460px] md:rounded-[2.5rem] md:shadow-[0_20px_60px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
            {/* Mobile Sheet Handle */}
            <div className="flex w-full justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-black/10" />
            </div>
            <div className="flex shrink-0 flex-col gap-1.5 border-b border-black/[0.03] bg-white/80 backdrop-blur-md px-4 py-4 text-neutral-900 md:px-6">
              {context && (!!context.categoryId || (context.productIds?.length ?? 0) > 0) ? (
                <button
                  type="button"
                  onClick={context.fromHomeFeatured ? closeChatAndGoToMenu : closeChatKeepCart}
                  className="w-fit text-left text-[10px] font-black uppercase tracking-widest text-bloom-600 hover:text-bloom-800 transition-colors"
                >
                  ← Ver categorías
                </button>
              ) : null}
              <div className="flex items-center justify-between gap-2 mt-1">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-bloom-700 flex items-center justify-center text-white shadow-inner">
                    <IconShoppingBag size={16} strokeWidth={2.5} />
                  </div>
                  <h2 id="bloom-chat-title" className="truncate font-black text-lg tracking-tight text-neutral-900">
                    {context?.displayName ?? "Bloom IconBuildingStore"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => closeModal()}
                  className="shrink-0 rounded-full p-2 bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-500"
                  aria-label="Cerrar"
                >
                  <IconX size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="min-h-0 w-full flex-1 space-y-3 overflow-y-auto px-3 py-3 pb-24"
            >
              {!context?.fromHomeFeatured ? (
                <div className="max-w-[92%] rounded-2xl bg-white px-3 py-2 text-sm leading-relaxed text-neutral-800 shadow-sm ring-1 ring-black/5">
                  {introText.split("\n").map((line, li, arr) => (
                    <span key={li}>
                      {line}
                      {li < arr.length - 1 ? <br /> : null}
                    </span>
                  ))}
                </div>
              ) : null}

              {softAuthHintVisible ? (
                <div className="max-w-[92%] rounded-2xl border border-amber-100/80 bg-amber-50/90 px-3 py-2.5 text-sm leading-relaxed text-neutral-800 shadow-sm ring-1 ring-amber-200/60">
                  <div>
                    💡 Registrate para una mejor atención — guardamos tus datos y tu historial de encargos.{" "}
                    <button
                      type="button"
                      onClick={persistCartAndGoToRegistro}
                      className="font-semibold text-[#2d4a3e] underline underline-offset-2 hover:text-[#1a3028]"
                    >
                      Registrate gratis →
                    </button>{" "}
                  </div>
                </div>
              ) : null}

              {successMessage && (
                <div className="space-y-2">
                  <div className="max-w-[92%] rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200">
                    {successMessage}
                  </div>
                  {showHistoryLink && (
                    <Link
                      href="/registro"
                      className="inline-block text-xs font-semibold text-[#2d4a3e] underline underline-offset-2 hover:text-[#1a3028]"
                    >
                      Creá tu cuenta para ver el historial de tus encargos
                    </Link>
                  )}
                </div>
              )}

              {loadingProducts && showProductGrid && (
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <IconLoader2 className="h-4 w-4 animate-spin" /> Cargando productos…
                </div>
              )}

              {!loadingProducts && showProductGrid && (
                <>
                  {products.length === 0 && dailyOffersList.length === 0 ? (
                    <p className="text-sm text-neutral-500">No hay productos activos en esta categoría por ahora.</p>
                  ) : (
                    <div className="flex w-full flex-col gap-3">
                      {[...dailyOffersList, ...products].map((p) => (
                        <ProductCard
                          key={`${productListKey}-${p.id}`}
                          product={p}
                          isLoggedIn={!!session}
                          added={!productHasConfigurableOptions(p) && addedProductIds.has(p.id)}
                          onEncargar={(obs, qty, choice) => addLine(p, obs, qty, choice)}
                          onRemove={() => {
                            setCart(prev => prev.filter(l => l.product_id !== p.id));
                            setAddedProductIds(prev => { const next = new Set(prev); next.delete(p.id); return next; });
                          }}
                          onLoginClick={persistCartAndGoToRegistro}
                          onAuthClick={persistCartAndGoToAuth}
                        />
                      ))}
                    </div>
                  )}
                  {context?.fromHomeFeatured ? (
                    <>
                      <div className="relative my-2 flex items-center gap-3 py-1">
                        <div className="h-px flex-1 bg-[#e0dcd4]" aria-hidden />
                        <p className="shrink-0 text-center text-xs font-semibold text-neutral-500">
                          — o explorá el menú completo —
                        </p>
                        <div className="h-px flex-1 bg-[#e0dcd4]" aria-hidden />
                      </div>
                      <button
                        type="button"
                        onClick={closeChatAndGoToMenu}
                        className="w-full rounded-xl border-2 border-[#2d4a3e] bg-white px-4 py-3 text-center text-sm font-black text-[#2d4a3e] shadow-sm transition hover:bg-[#2d4a3e] hover:text-white"
                      >
                        Ver todas las categorías →
                      </button>
                    </>
                  ) : null}
                </>
              )}

              {upsellVariant ? (
                <div className="w-full max-w-[92%] rounded-2xl border border-[#c4b896]/50 bg-[#faf8f3] px-3 py-3 text-sm text-neutral-800 shadow-sm ring-1 ring-[#2d4a3e]/10">
                  <p className="font-semibold leading-snug text-[#2d4a3e]">{UPSELL_PRIMARY[upsellVariant]}</p>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-600">{UPSELL_FOOTER}</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={context?.fromHomeFeatured ? closeChatAndGoToMenu : closeChatKeepCart}
                      className="w-full rounded-xl border-2 border-[#d4cfc4] bg-white px-3 py-2.5 text-center text-xs font-bold text-neutral-800 hover:bg-neutral-50"
                    >
                      Ver otras categorías
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUpsellVariant(null);
                        setEncargoOpen(true);
                      }}
                      className="w-full rounded-xl bg-[#2d4a3e] px-3 py-2.5 text-center text-xs font-black uppercase tracking-wide text-white shadow hover:bg-[#1f342c]"
                    >
                      No, confirmar encargo →
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {cartCount > 0 && !upsellVariant ? (
              <div className="sticky bottom-0 z-10 border-t border-[#e0dcd4] bg-[#f7f5ef]/95 px-3 py-4 pb-[max(2.5rem,env(safe-area-inset-bottom)+1.5rem)] backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setEncargoOpen(true)}
                  className="flex w-full items-center justify-between rounded-xl bg-[#2d4a3e] px-4 py-3 text-left text-sm font-bold text-white shadow-lg transition hover:bg-[#1f342c]"
                >
                  <span>
                    {cartCount} {cartCount === 1 ? "producto" : "productos"} — Ver encargo →
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
});
