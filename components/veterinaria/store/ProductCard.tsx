"use client";
import Link from "next/link";
import { memo, useState } from "react";
import { Heart, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Category, Product } from "@/lib/vet/types";
import { vetPath } from "@/lib/vet/config/integrations";
import { canPurchase, getStockStatus, STOCK_STATUS_META } from "@/lib/vet/domain/stock";
import { displayPrice } from "@/lib/vet/domain/pricing";
import { waLink, WA_MESSAGES } from "@/lib/vet/domain/whatsapp";
import { useCart } from "@/lib/vet/client/cart";
import { toggleFavorite } from "@/lib/vet/client/actions";
import { track } from "@/lib/vet/client/analytics";
import { useFavoriteIds } from "./hooks";
import { useSettings } from "@/lib/vet/client/store";
import { ProductImage, PriceTag } from "./ProductVisuals";
import { Badge } from "../ui/primitives";
import { cn } from "@/lib/utils";

function ProductCardBase({ product, category, priority }: { product: Product; category?: Category; priority?: boolean }) {
  const add = useCart((s) => s.add);
  const favs = useFavoriteIds();
  const settings = useSettings();
  const [popped, setPopped] = useState(false);
  const isFav = favs.includes(product.id);
  const status = getStockStatus(product);
  const hasVariants = product.variants.length > 0;
  const { price } = displayPrice(product);
  const href = vetPath(`/producto/${product.slug}`);
  const buyable = !hasVariants && canPurchase(product);
  const consult = product.requiresConsultation || price == null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-16px_rgba(20,80,80,0.35)]">
      <Link href={href} className="block" aria-label={product.name} prefetch={false}>
        <ProductImage product={product} category={category} priority={priority} className="aspect-square" />
      </Link>

      <button
        type="button"
        onClick={() => {
          toggleFavorite(product.id);
          setPopped(true);
          setTimeout(() => setPopped(false), 400);
        }}
        aria-pressed={isFav}
        aria-label={isFav ? `Quitar ${product.name} de favoritos` : `Agregar ${product.name} a favoritos`}
        className="absolute right-2.5 top-2.5 grid size-10 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-105"
      >
        <Heart className={cn("size-[18px] transition", isFav ? "fill-vet-accent text-vet-accent" : "text-neutral-500", popped && "vet-pop")} />
      </button>

      <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1">
        {(status === "poco" || status === "sin_stock") && <Badge tone={STOCK_STATUS_META[status].tone === "red" ? "red" : "amber"}>{STOCK_STATUS_META[status].label}</Badge>}
      </div>

      <div className="flex flex-1 flex-col p-3.5 pt-3">
        {product.subcategory && <p className="mb-0.5 truncate text-[11px] font-medium uppercase tracking-wide text-neutral-500">{product.subcategory}</p>}
        <Link href={href} prefetch={false} className="line-clamp-2 min-h-[2.5rem] text-[14px] font-semibold leading-snug text-vet-ink hover:text-vet-primary-dark">
          {product.name}
        </Link>
        {hasVariants && <p className="mt-0.5 text-xs text-neutral-500">{product.variants.length} opciones</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2.5">
          <PriceTag product={product} />
          {buyable ? (
            <button
              type="button"
              onClick={() => {
                add({ productId: product.id, quantity: 1 });
                toast.success("Agregado al carrito", { description: product.name, action: { label: "Ver carrito", onClick: () => (window.location.href = vetPath("/carrito")) } });
              }}
              className="grid size-11 shrink-0 place-items-center rounded-2xl bg-vet-primary text-white shadow-sm transition hover:bg-vet-primary-dark active:scale-95"
              aria-label={`Agregar ${product.name} al carrito`}
            >
              <Plus className="size-5" />
            </button>
          ) : consult ? (
            <a
              href={waLink(settings.business.whatsapp, product.requiresConsultation ? WA_MESSAGES.consultation(product.name) : WA_MESSAGES.product(product.name))}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("whatsapp_click", { context: "product_card", productId: product.id })}
              className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#128C4B] text-white shadow-sm transition hover:bg-[#0e7a40]"
              aria-label={`Consultar por ${product.name} en WhatsApp`}
            >
              <MessageCircle className="size-5" />
            </a>
          ) : (
            <Link href={href} prefetch={false} className="grid size-11 shrink-0 place-items-center rounded-2xl bg-vet-tint text-vet-primary-dark transition hover:bg-vet-tint-strong" aria-label={`Elegir opciones de ${product.name}`}>
              <Plus className="size-5" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export const ProductCard = memo(ProductCardBase);

export function ProductGrid({ products, categories, priorityCount = 2, className }: { products: Product[]; categories: Category[]; priorityCount?: number; className?: string }) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5", className)}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} category={byId.get(p.categoryId)} priority={i < priorityCount} />
      ))}
    </div>
  );
}

export function ProductRail({ products, categories }: { products: Product[]; categories: Category[] }) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return (
    <div className="vet-scroll-x -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
      {products.map((p) => (
        <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-[23%] lg:w-[19%]">
          <ProductCard product={p} category={byId.get(p.categoryId)} />
        </div>
      ))}
    </div>
  );
}
