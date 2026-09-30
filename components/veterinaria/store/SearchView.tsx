"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, MessageCircle, PackageSearch, Search, X } from "lucide-react";
import type { Category, Service } from "@/lib/vet/types";
import { vetPath } from "@/lib/vet/config/integrations";
import { createProductSearch, POPULAR_SEARCHES, searchServices } from "@/lib/vet/domain/search";
import { waLink, WA_MESSAGES } from "@/lib/vet/domain/whatsapp";
import { useSettings } from "@/lib/vet/client/store";
import { track } from "@/lib/vet/client/analytics";
import { useCatalog } from "./hooks";
import { ProductGrid } from "./ProductCard";
import { ButtonLink, EmptyState, Skeleton } from "../ui/primitives";

export function SearchView({ categories: initialCats, services }: { categories: Category[]; services: Service[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const settings = useSettings();
  const initialQ = params.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [debounced, setDebounced] = useState(initialQ);
  const inputRef = useRef<HTMLInputElement>(null);
  const { products, categories, ready } = useCatalog([], initialCats);

  useEffect(() => {
    if (!initialQ) inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q);
      const url = q.trim() ? vetPath(`/buscar?q=${encodeURIComponent(q.trim())}`) : vetPath("/buscar");
      router.replace(url, { scroll: false });
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const search = useMemo(() => (ready ? createProductSearch(products, categories) : null), [ready, products, categories]);
  const results = useMemo(() => (search && debounced.trim() ? search(debounced, 60).map((r) => r.item) : []), [search, debounced]);
  const svc = useMemo(() => (debounced.trim() ? searchServices(services, debounced) : []), [services, debounced]);

  useEffect(() => {
    if (debounced.trim().length >= 2 && ready) track("search", { q: debounced.trim().toLowerCase(), results: results.length });
  }, [debounced, ready]);

  return (
    <div>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
        <label htmlFor="vet-search" className="sr-only">Buscar productos, marcas o servicios</label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400" />
        <input
          ref={inputRef}
          id="vet-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ej: arena gato, antipulgas, buzo talle 4…"
          className="h-14 w-full rounded-2xl border border-black/10 bg-white pl-12 pr-12 text-[16px] shadow-sm outline-none focus:border-vet-primary focus:ring-4 focus:ring-vet-primary/15"
          autoComplete="off"
          enterKeyHint="search"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-neutral-500 hover:bg-black/5" aria-label="Borrar búsqueda">
            <X className="size-5" />
          </button>
        )}
      </form>

      {!debounced.trim() ? (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-neutral-600">Búsquedas frecuentes</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((s) => (
              <button key={s} type="button" onClick={() => setQ(s)} className="h-10 rounded-full bg-white px-4 text-sm font-semibold ring-1 ring-black/[0.08] hover:ring-vet-primary/40">
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5">
          {svc.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {svc.map((s) => (
                <Link key={s.id} href={vetPath(`/turnos?servicio=${s.id}`)} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-vet-tint px-4 text-sm font-bold text-vet-primary-dark">
                  <CalendarCheck className="size-4" /> Reservar {s.name.toLowerCase()}
                </Link>
              ))}
            </div>
          )}
          {!ready ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-[3/4]" />)}
            </div>
          ) : results.length ? (
            <>
              <p className="mb-3 text-sm text-neutral-600" aria-live="polite">{results.length} resultados para «{debounced}»</p>
              <ProductGrid products={results} categories={categories} />
            </>
          ) : (
            <EmptyState
              icon={<PackageSearch className="size-6" />}
              title={`No encontramos «${debounced}»`}
              text="Puede que lo tengamos en el local o que lo podamos conseguir. Escribinos y te respondemos."
              action={
                <ButtonLink href={waLink(settings.business.whatsapp, `Hola, ¿tienen ${debounced}?`)} external variant="whatsapp" onClick={() => track("whatsapp_click", { context: "search_empty", q: debounced })}>
                  <MessageCircle className="size-4" /> Consultar por WhatsApp
                </ButtonLink>
              }
            />
          )}
          {results.length > 0 && (
            <p className="mt-6 text-center text-sm text-neutral-600">
              ¿No es lo que buscabas?{" "}
              <a className="font-semibold text-vet-primary-dark underline" href={waLink(settings.business.whatsapp, WA_MESSAGES.help())} target="_blank" rel="noopener noreferrer">
                Preguntanos por WhatsApp
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
