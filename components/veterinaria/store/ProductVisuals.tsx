"use client";
import Image from "next/image";
import type { Category, Product } from "@/lib/vet/types";
import { NamedIcon } from "../ui/icons";
import { displayPrice } from "@/lib/vet/domain/pricing";
import { formatMoney } from "@/lib/vet/domain/format";
import { cn } from "@/lib/utils";

/** Fondo suave por categoría para los productos que todavía no tienen foto. */
const PLACEHOLDER_TONES: Record<string, string> = {
  farmacia: "from-[#e6f3f3] to-[#d3ebeb] text-vet-primary",
  higiene: "from-[#eef6fb] to-[#dcecf6] text-sky-700",
  paseo: "from-[#f6efe6] to-[#ecdfcc] text-vet-warm",
  juguetes: "from-[#fdf0f3] to-[#f8dfe6] text-vet-accent",
  indumentaria: "from-[#f3f0fa] to-[#e6e0f4] text-violet-700",
  comederos: "from-[#eef7ef] to-[#dbeedd] text-emerald-700",
  descanso: "from-[#f7f3ec] to-[#ece4d6] text-vet-warm",
  transporte: "from-[#eef2f6] to-[#dde5ee] text-slate-600",
  regalos: "from-[#fdf3ea] to-[#f8e3cf] text-orange-700",
};

export function ProductImage({ product, category, sizes = "(max-width: 640px) 50vw, 25vw", priority, className }: { product: Product; category?: Category; sizes?: string; priority?: boolean; className?: string }) {
  const src = product.images[0];
  if (src) {
    return (
      <div className={cn("relative overflow-hidden bg-white", className)}>
        <Image src={src} alt={product.name} fill sizes={sizes} priority={priority} className="object-contain p-2" />
      </div>
    );
  }
  return (
    <div className={cn("@container relative grid place-items-center overflow-hidden bg-gradient-to-br", PLACEHOLDER_TONES[product.categoryId] ?? "from-vet-tint to-vet-tint-strong text-vet-primary", className)} role="img" aria-label={`${product.name} (foto próximamente)`}>
      <NamedIcon name={category?.icon ?? "PawPrint"} className="size-[34%] opacity-80" strokeWidth={1.4} />
      <span className="absolute bottom-2 left-1/2 hidden -translate-x-1/2 whitespace-nowrap @[8rem]:block rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium text-neutral-600 backdrop-blur">Foto próximamente</span>
    </div>
  );
}

export function PriceTag({ product, size = "md" }: { product: Product; size?: "md" | "lg" }) {
  const { price, from, compareAt } = displayPrice(product);
  if (price == null) {
    return <span className={cn("font-semibold text-vet-primary-dark", size === "lg" ? "text-lg" : "text-sm")}>Consultar precio</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      {from && <span className="text-xs font-medium text-neutral-500">Desde</span>}
      <span className={cn("font-extrabold tracking-[-0.01em] text-vet-ink tabular-nums", size === "lg" ? "text-3xl" : "text-[17px]")}>{formatMoney(price)}</span>
      {compareAt && <span className="text-sm text-neutral-400 line-through tabular-nums">{formatMoney(compareAt)}</span>}
    </span>
  );
}
