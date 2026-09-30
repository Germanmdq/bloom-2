"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, PackageSearch, SlidersHorizontal } from "lucide-react";
import type { Category, Product, Species } from "@/lib/vet/types";
import { vetPath } from "@/lib/vet/config/integrations";
import { displayPrice } from "@/lib/vet/domain/pricing";
import { SPECIES_META } from "@/lib/vet/domain/labels";
import { track } from "@/lib/vet/client/analytics";
import { useCatalog } from "./hooks";
import { ProductGrid } from "./ProductCard";
import { EmptyState } from "../ui/primitives";
import { cn } from "@/lib/utils";

type Sort = "relevancia" | "precio_asc" | "precio_desc" | "nombre";
const PAGE = 24;

function relevance(p: Product) {
  let s = 0;
  if (p.featured) s += 4;
  if (displayPrice(p).price != null) s += 2;
  if (p.images.length) s += 1;
  if (p.variants.length) s += 0.5;
  return s;
}

export function CatalogView({ initialProducts, categories, category, total }: { initialProducts: Product[]; categories: Category[]; category?: Category; total: number }) {
  const { products, ready } = useCatalog(initialProducts, categories);
  const [species, setSpecies] = useState<Species | "todas">("todas");
  const [sub, setSub] = useState<string>("todas");
  const [onlyPrice, setOnlyPrice] = useState(false);
  const [sort, setSort] = useState<Sort>("relevancia");
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    if (category) track("category_view", { categoryId: category.id });
  }, [category?.id]);

  const visibleCats = categories.filter((c) => c.visible).sort((a, b) => a.order - b.order);
  const base = useMemo(() => products.filter((p) => p.visible && (!category || p.categoryId === category.id)), [products, category]);
  const subcats = useMemo(() => [...new Set(base.map((p) => p.subcategory).filter(Boolean) as string[])].sort(), [base]);
  const speciesOptions = useMemo(() => (["perro", "gato"] as Species[]).filter((s) => base.some((p) => p.species.includes(s))), [base]);

  const list = useMemo(() => {
    let l = base;
    if (species !== "todas") l = l.filter((p) => p.species.includes(species));
    if (sub !== "todas") l = l.filter((p) => p.subcategory === sub);
    if (onlyPrice) l = l.filter((p) => displayPrice(p).price != null);
    const price = (p: Product) => displayPrice(p).price ?? Number.POSITIVE_INFINITY;
    const sorted = [...l];
    if (sort === "precio_asc") sorted.sort((a, b) => price(a) - price(b));
    else if (sort === "precio_desc") sorted.sort((a, b) => (displayPrice(b).price ?? -1) - (displayPrice(a).price ?? -1));
    else if (sort === "nombre") sorted.sort((a, b) => a.name.localeCompare(b.name, "es"));
    else sorted.sort((a, b) => relevance(b) - relevance(a));
    return sorted;
  }, [base, species, sub, onlyPrice, sort]);

  const shown = ready ? list.slice(0, limit) : initialProducts;
  const count = ready ? list.length : total;

  return (
    <div>
      {!category && (
        <nav aria-label="Categorías" className="vet-scroll-x -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
          <span className="shrink-0 rounded-full bg-vet-ink px-4 py-2 text-[13px] font-semibold text-white">Todo</span>
          {visibleCats.map((c) => (
            <Link key={c.id} href={vetPath(`/tienda/${c.slug}`)} className="shrink-0 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-vet-ink ring-1 ring-black/[0.08] transition hover:ring-vet-primary/40">
              {c.name}
            </Link>
          ))}
        </nav>
      )}

      <div className="sticky top-16 z-30 -mx-4 mb-4 border-b border-black/[0.04] bg-vet-surface/90 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:top-[72px]">
        <div className="flex items-center gap-2">
          <div className="vet-scroll-x flex flex-1 gap-2 overflow-x-auto" role="group" aria-label="Filtros">
            {speciesOptions.length > 1 &&
              (["todas", ...speciesOptions] as const).map((s) => (
                <button key={s} type="button" onClick={() => { setSpecies(s); setLimit(PAGE); }} aria-pressed={species === s} className={cn("h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold ring-1 transition", species === s ? "bg-vet-primary text-white ring-vet-primary" : "bg-white text-vet-ink ring-black/[0.08] hover:ring-vet-primary/40")}>
                  {s === "todas" ? "Todas las mascotas" : SPECIES_META[s].plural}
                </button>
              ))}
            <button type="button" onClick={() => { setOnlyPrice((v) => !v); setLimit(PAGE); }} aria-pressed={onlyPrice} className={cn("h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold ring-1 transition", onlyPrice ? "bg-vet-primary text-white ring-vet-primary" : "bg-white text-vet-ink ring-black/[0.08]")}>
              Con precio online
            </button>
            {subcats.length > 1 && (
              <label className="relative shrink-0">
                <span className="sr-only">Subcategoría</span>
                <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-500" />
                <select value={sub} onChange={(e) => { setSub(e.target.value); setLimit(PAGE); }} className="h-9 appearance-none rounded-full bg-white pl-8 pr-4 text-[13px] font-semibold ring-1 ring-black/[0.08] outline-none">
                  <option value="todas">Todas las subcategorías</option>
                  {subcats.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <label className="relative shrink-0">
            <span className="sr-only">Ordenar</span>
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-500" />
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-9 w-[132px] appearance-none rounded-full bg-white pl-8 pr-3 text-[13px] font-semibold ring-1 ring-black/[0.08] outline-none">
              <option value="relevancia">Destacados</option>
              <option value="precio_asc">Menor precio</option>
              <option value="precio_desc">Mayor precio</option>
              <option value="nombre">Nombre A-Z</option>
            </select>
          </label>
        </div>
      </div>

      <p className="mb-3 text-sm text-neutral-600" aria-live="polite">
        {count} {count === 1 ? "producto" : "productos"}
      </p>

      {shown.length ? (
        <ProductGrid products={shown} categories={categories} priorityCount={4} />
      ) : (
        <EmptyState icon={<PackageSearch className="size-6" />} title="No encontramos productos con esos filtros" text="Probá quitar algún filtro o escribinos: si no está en la tienda, lo consultamos." />
      )}

      {ready && list.length > limit && (
        <div className="mt-6 flex justify-center">
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="h-12 rounded-2xl bg-white px-6 text-sm font-bold text-vet-ink shadow-sm ring-1 ring-black/[0.08] hover:ring-vet-primary/40">
            Ver más productos ({list.length - limit})
          </button>
        </div>
      )}
    </div>
  );
}
