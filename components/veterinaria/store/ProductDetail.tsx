"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Heart, MessageCircle, Share2, ShieldCheck, ShoppingBag, Store, Truck } from "lucide-react";
import { toast } from "sonner";
import type { Category, Product } from "@/lib/vet/types";
import { vetPath, INTEGRATIONS } from "@/lib/vet/config/integrations";
import { canPurchase, getStockStatus, STOCK_STATUS_META, stockStatusOf } from "@/lib/vet/domain/stock";
import { unitPriceOf } from "@/lib/vet/domain/pricing";
import { formatMoney } from "@/lib/vet/domain/format";
import { SPECIES_META } from "@/lib/vet/domain/labels";
import { waLink, WA_MESSAGES } from "@/lib/vet/domain/whatsapp";
import { alsoBought, type RecommendationGroup } from "@/lib/vet/domain/recommendations";
import { useCart } from "@/lib/vet/client/cart";
import { useCollection, useSettings } from "@/lib/vet/client/store";
import { toggleFavorite } from "@/lib/vet/client/actions";
import { track } from "@/lib/vet/client/analytics";
import { useFavoriteIds, useLiveProduct, useLiveProducts } from "./hooks";
import { ProductImage, PriceTag } from "./ProductVisuals";
import { ProductRail } from "./ProductCard";
import { Badge, Button, ButtonLink, QuantityStepper, SectionTitle } from "../ui/primitives";
import { cn } from "@/lib/utils";

export function ProductDetail({ initial, category, categories, groups }: { initial: Product; category?: Category; categories: Category[]; groups: RecommendationGroup[] }) {
  const product = useLiveProduct(initial);
  const settings = useSettings();
  const add = useCart((s) => s.add);
  const favs = useFavoriteIds();
  const firstAvailable = product.variants.find((v) => v.price != null && (v.stock == null || v.stock > 0));
  const [variantId, setVariantId] = useState<string | undefined>(firstAvailable?.id);
  const [qty, setQty] = useState(1);
  const variant = product.variants.find((v) => v.id === variantId);
  const price = unitPriceOf(product, variantId);
  const buyable = canPurchase(product, variantId);
  const status = variant ? stockStatusOf(variant.stock, product.minStock) : getStockStatus(product);
  const stock = variant ? variant.stock : product.stock;
  const url = `${INTEGRATIONS.siteUrl}${vetPath(`/producto/${product.slug}`)}`;
  const isFav = favs.includes(product.id);

  useEffect(() => {
    track("product_view", { productId: product.id, categoryId: product.categoryId });
  }, [product.id]);

  // "Otros clientes también compraron" con pedidos reales (modo demo: los del navegador).
  const orders = useCollection("orders", INTEGRATIONS.dataSource === "demo");
  const all = useCollection("products", INTEGRATIONS.dataSource === "demo");
  const liveGroups = useMemo(() => {
    const bought = orders.ready && all.ready ? alsoBought(product.id, orders.items, all.items, 10) : [];
    const used = new Set(groups.flatMap((g) => g.products.map((p) => p.id)));
    const extra = bought.filter((p) => !used.has(p.id));
    return extra.length >= 2 ? [...groups, { label: "Otros clientes también compraron", products: extra }] : groups;
  }, [groups, orders.items, all.items, orders.ready, all.ready, product.id]);

  const addToCart = () => {
    add({ productId: product.id, variantId, quantity: qty });
    toast.success("Agregado al carrito", { description: `${product.name}${variant ? ` · ${variant.label}` : ""} x${qty}`, action: { label: "Ver carrito", onClick: () => (window.location.href = vetPath("/carrito")) } });
  };
  const wa = (text: string, context: string) => ({
    href: waLink(settings.business.whatsapp, text),
    onClick: () => track("whatsapp_click", { context, productId: product.id }),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
      <nav aria-label="Ruta de navegación" className="mb-4 flex min-w-0 items-center gap-1 text-[13px] text-neutral-500">
        <Link href={vetPath("/tienda")} className="shrink-0 hover:text-vet-primary">Tienda</Link>
        {category && (
          <>
            <ChevronRight className="size-3.5 shrink-0" />
            <Link href={vetPath(`/tienda/${category.slug}`)} className="truncate hover:text-vet-primary">{category.name}</Link>
          </>
        )}
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-12">
        <div className="relative">
          <ProductImage product={product} category={category} priority sizes="(max-width: 1024px) 100vw, 50vw" className="aspect-square rounded-[28px] ring-1 ring-black/[0.05]" />
          <div className="absolute right-3 top-3 flex flex-col gap-2">
            <button type="button" onClick={() => toggleFavorite(product.id)} aria-pressed={isFav} aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"} className="grid size-11 place-items-center rounded-full bg-white/95 shadow-sm">
              <Heart className={cn("size-5", isFav ? "fill-vet-accent text-vet-accent" : "text-neutral-600")} />
            </button>
            <button
              type="button"
              aria-label="Compartir"
              className="grid size-11 place-items-center rounded-full bg-white/95 shadow-sm"
              onClick={async () => {
                try {
                  if (navigator.share) await navigator.share({ title: product.name, url });
                  else {
                    await navigator.clipboard.writeText(url);
                    toast.success("Enlace copiado");
                  }
                } catch {}
              }}
            >
              <Share2 className="size-5 text-neutral-600" />
            </button>
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.images.slice(0, 5).map((src) => (
                <img key={src} src={src} alt="" className="aspect-square rounded-xl object-cover ring-1 ring-black/5" loading="lazy" />
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            {product.subcategory && <Badge tone="gray">{product.subcategory}</Badge>}
            {product.species.filter((s) => s !== "personas").map((s) => (
              <Badge key={s} tone="teal">{SPECIES_META[s].plural}</Badge>
            ))}
            {status !== "sin_control" && !product.requiresConsultation && <Badge tone={STOCK_STATUS_META[status].tone === "red" ? "red" : STOCK_STATUS_META[status].tone === "amber" ? "amber" : "green"}>{STOCK_STATUS_META[status].label}</Badge>}
          </div>
          <h1 className="mt-3 font-vet-display text-[26px] font-extrabold leading-tight tracking-[-0.01em] sm:text-3xl">{product.name}</h1>
          {product.brand && <p className="mt-1 text-sm text-neutral-500">Marca: {product.brand}</p>}

          <div className="mt-4">
            {variant || !product.variants.length ? (
              price != null ? (
                <span className="text-3xl font-extrabold tracking-[-0.01em] tabular-nums">{formatMoney(price)}</span>
              ) : (
                <span className="text-lg font-semibold text-vet-primary-dark">Consultar precio</span>
              )
            ) : (
              <PriceTag product={product} size="lg" />
            )}
            {product.compareAtPrice && product.price && product.compareAtPrice > product.price && !variant && (
              <span className="ml-2 text-base text-neutral-400 line-through">{formatMoney(product.compareAtPrice)}</span>
            )}
          </div>

          {product.variants.length > 0 && (
            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-semibold">Elegí una opción</legend>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const off = v.price == null || (v.stock != null && v.stock <= 0);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariantId(v.id)}
                      aria-pressed={variantId === v.id}
                      className={cn(
                        "min-h-11 rounded-2xl px-4 text-sm font-semibold ring-1 transition",
                        variantId === v.id ? "bg-vet-ink text-white ring-vet-ink" : "bg-white text-vet-ink ring-black/10 hover:ring-vet-primary/50",
                        off && "opacity-50 line-through",
                      )}
                    >
                      {v.label}
                      {v.price != null && <span className={cn("ml-1.5 font-normal", variantId === v.id ? "text-white/75" : "text-neutral-500")}>{formatMoney(v.price)}</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {product.requiresConsultation ? (
            <div className="mt-6 rounded-3xl bg-vet-tint p-4">
              <p className="flex items-start gap-2 text-sm leading-relaxed text-vet-primary-dark">
                <ShieldCheck className="mt-0.5 size-5 shrink-0" />
                Producto de farmacia veterinaria: lo vendemos con asesoramiento para indicarte la presentación y el uso adecuados. No reemplaza la consulta con un veterinario.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <ButtonLink {...wa(WA_MESSAGES.consultation(product.name), "product_rx")} external variant="whatsapp" size="lg">
                  <MessageCircle className="size-5" /> Consultar por WhatsApp
                </ButtonLink>
                <ButtonLink href={vetPath("/turnos?servicio=consulta")} variant="outline" size="lg">
                  Reservar consulta
                </ButtonLink>
              </div>
            </div>
          ) : (
            <>
              {buyable && (
                <div className="mt-6 flex items-center gap-3">
                  <QuantityStepper value={qty} onChange={(v) => setQty(Math.max(1, v))} max={stock ?? 99} />
                  {status === "poco" && stock != null && <p className="text-sm font-medium text-amber-700">Quedan {stock}</p>}
                </div>
              )}
              <div className="mt-4 hidden gap-2 sm:grid sm:grid-cols-2">
                <Button size="lg" onClick={addToCart} disabled={!buyable}>
                  <ShoppingBag className="size-5" /> {buyable ? "Agregar al carrito" : price == null ? "Precio a consultar" : "Sin stock"}
                </Button>
                <ButtonLink {...wa(WA_MESSAGES.buyProduct(product.name, variant?.label, url), "product_buy")} external variant="whatsapp" size="lg">
                  <MessageCircle className="size-5" /> Comprar por WhatsApp
                </ButtonLink>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <a {...wa(WA_MESSAGES.product(product.name, url), "product_consult")} target="_blank" rel="noopener noreferrer" className="font-semibold text-vet-primary-dark underline-offset-4 hover:underline">
                  Consultar por WhatsApp
                </a>
                <a {...wa(WA_MESSAGES.availability(`${product.name}${variant ? ` (${variant.label})` : ""}`), "product_availability")} target="_blank" rel="noopener noreferrer" className="font-semibold text-vet-primary-dark underline-offset-4 hover:underline">
                  Consultar disponibilidad
                </a>
              </div>
            </>
          )}

          <ul className="mt-6 grid gap-2 text-sm text-neutral-700 sm:grid-cols-2">
            <li className="flex items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-black/[0.05]"><Truck className="size-4 text-vet-primary" /> Envío a domicilio</li>
            <li className="flex items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-black/[0.05]"><Store className="size-4 text-vet-primary" /> Retiro en el local</li>
          </ul>

          {product.description && (
            <section className="mt-6">
              <h2 className="text-base font-bold">Descripción</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-700">{product.description}</p>
            </section>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 rounded-3xl bg-white p-4 text-sm ring-1 ring-black/[0.05]">
            {product.code && (<><dt className="text-neutral-500">Código</dt><dd className="font-medium">{variant?.sku ?? product.code}</dd></>)}
            {category && (<><dt className="text-neutral-500">Categoría</dt><dd className="font-medium">{category.name}</dd></>)}
            {product.size && (<><dt className="text-neutral-500">Presentación</dt><dd className="font-medium">{product.size}</dd></>)}
            {product.barcode && (<><dt className="text-neutral-500">Código de barras</dt><dd className="font-medium">{product.barcode}</dd></>)}
          </dl>
        </div>
      </div>

      {liveGroups.map((g) => (
        <section key={g.label} className="mt-10">
          <SectionTitle title={g.label} />
          <ProductRailLive products={g.products} categories={categories} />
        </section>
      ))}

      {/* Barra fija de compra en celulares */}
      {!product.requiresConsultation && (
        <div className="fixed inset-x-0 bottom-[68px] z-40 border-t border-black/[0.06] bg-white/95 px-4 py-2.5 backdrop-blur-xl sm:hidden">
          <div className="flex items-center gap-2">
            <a {...wa(WA_MESSAGES.buyProduct(product.name, variant?.label, url), "product_buy_sticky")} target="_blank" rel="noopener noreferrer" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#128C4B] text-white" aria-label="Comprar por WhatsApp">
              <MessageCircle className="size-5" />
            </a>
            <Button size="lg" className="flex-1" onClick={addToCart} disabled={!buyable}>
              <ShoppingBag className="size-5" /> {buyable ? `Agregar · ${formatMoney((price ?? 0) * qty)}` : price == null ? "Precio a consultar" : "Sin stock"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductRailLive({ products, categories }: { products: Product[]; categories: Category[] }) {
  const live = useLiveProducts(products);
  return <ProductRail products={live} categories={categories} />;
}
