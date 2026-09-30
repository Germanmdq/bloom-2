"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Minus, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import type { Product, StockStatus } from "@/lib/vet/types";
import { adminPath } from "@/lib/vet/config/integrations";
import { formatMoney, normalizeText } from "@/lib/vet/domain/format";
import { getStockStatus, STOCK_STATUS_META, totalStock } from "@/lib/vet/domain/stock";
import { can } from "@/lib/vet/domain/permissions";
import { useCollection, useVetData } from "@/lib/vet/client/store";
import { useStaffRole } from "@/lib/vet/client/session";
import { adjustStock } from "@/lib/vet/client/actions";
import { ProductImage } from "../store/ProductVisuals";
import { Badge, ButtonLink, EmptyState, Select, Skeleton } from "../ui/primitives";
import { Chips, PageHeader } from "./ui";
import { cn } from "@/lib/utils";

type StockFilter = "todos" | "alerta" | StockStatus | "ocultos" | "sin_precio";
const PAGE = 40;

export function ProductsAdmin() {
  const params = useSearchParams();
  const { role, name } = useStaffRole();
  const products = useCollection("products");
  const categories = useCollection("categories");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("todas");
  const [filter, setFilter] = useState<StockFilter>((params.get("stock") as StockFilter) ?? "todos");
  const [limit, setLimit] = useState(PAGE);
  const canPrice = can(role, "prices.manage");
  const canEdit = can(role, "products.manage");

  useEffect(() => setLimit(PAGE), [q, cat, filter]);

  const list = useMemo(() => {
    const t = normalizeText(q);
    return products.items.filter((p) => {
      if (cat !== "todas" && p.categoryId !== cat) return false;
      const s = getStockStatus(p);
      if (filter === "alerta" && s !== "poco" && s !== "sin_stock") return false;
      if (filter === "ocultos" && p.visible) return false;
      if (filter === "sin_precio" && (p.price != null || p.variants.some((v) => v.price != null))) return false;
      if (["disponible", "poco", "sin_stock", "sin_control"].includes(filter) && s !== filter) return false;
      if (t && !normalizeText(`${p.name} ${p.code ?? ""} ${p.sku ?? ""} ${p.barcode ?? ""} ${p.brand ?? ""}`).includes(t)) return false;
      return true;
    });
  }, [products.items, q, cat, filter]);

  const counts = useMemo(() => {
    const c = { alerta: 0, ocultos: 0, sin_precio: 0, sin_control: 0 };
    for (const p of products.items) {
      const s = getStockStatus(p);
      if (s === "poco" || s === "sin_stock") c.alerta++;
      if (s === "sin_control") c.sin_control++;
      if (!p.visible) c.ocultos++;
      if (p.price == null && !p.variants.some((v) => v.price != null)) c.sin_precio++;
    }
    return c;
  }, [products.items]);

  return (
    <div>
      <PageHeader
        title="Productos y precios"
        subtitle={`${products.items.length} productos · cambiá precio y stock directamente desde la lista`}
        actions={canEdit && <ButtonLink href={adminPath("/productos/nuevo")}><Plus className="size-4" /> Nuevo producto</ButtonLink>}
      />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <label htmlFor="p-search" className="sr-only">Buscar productos</label>
          <input id="p-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, código, SKU o código de barras" className="h-11 w-full rounded-2xl border border-black/10 bg-white pl-10 pr-3 text-[15px] outline-none focus:border-vet-primary focus:ring-4 focus:ring-vet-primary/15" />
        </div>
        <Select label="Categoría" className="sm:w-64 [&>label]:sr-only" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="todas">Todas las categorías</option>
          {categories.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>
      <Chips
        label="Filtros"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "todos", label: "Todos" },
          { value: "alerta", label: "⚠️ Poco o sin stock", count: counts.alerta },
          { value: "sin_control", label: "Stock sin cargar", count: counts.sin_control },
          { value: "sin_precio", label: "Sin precio", count: counts.sin_precio },
          { value: "ocultos", label: "Ocultos", count: counts.ocultos },
        ]}
      />

      <div className="mt-4">
        {!products.ready ? (
          <Skeleton className="h-96" />
        ) : list.length ? (
          <>
            <p className="mb-2 text-sm text-neutral-500">{list.length} resultados</p>
            <ul className="space-y-2">
              {list.slice(0, limit).map((p) => (
                <ProductRow key={p.id} product={p} canPrice={canPrice} canEdit={canEdit} userName={name} />
              ))}
            </ul>
            {list.length > limit && (
              <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="mt-4 h-12 w-full rounded-2xl bg-white text-sm font-bold ring-1 ring-black/[0.08]">
                Ver más ({list.length - limit})
              </button>
            )}
          </>
        ) : (
          <EmptyState icon={<Search className="size-6" />} title="No hay productos con estos filtros" />
        )}
      </div>
    </div>
  );
}

function ProductRow({ product: p, canPrice, canEdit, userName }: { product: Product; canPrice: boolean; canEdit: boolean; userName: string }) {
  const upsert = useVetData((s) => s.upsert);
  const status = getStockStatus(p);
  const stock = totalStock(p);
  const [price, setPrice] = useState(p.price?.toString() ?? "");
  const [stockInput, setStockInput] = useState(p.stock?.toString() ?? "");
  useEffect(() => setPrice(p.price?.toString() ?? ""), [p.price]);
  useEffect(() => setStockInput(p.stock?.toString() ?? ""), [p.stock]);
  const hasVariants = p.variants.length > 0;

  const savePrice = async () => {
    const v = price.trim() === "" ? null : Math.round(Number(price));
    if (v != null && (!Number.isFinite(v) || v < 0)) return toast.error("Precio inválido");
    if (v === p.price) return;
    await upsert("products", { ...p, price: v, updatedAt: new Date().toISOString() });
    toast.success(`Precio actualizado: ${formatMoney(v)}`, { description: p.name });
  };
  const setStock = async (value: number, type: "ajuste" | "entrada" | "salida" = "ajuste") => {
    await adjustStock(p, { type, quantity: value, reason: "Ajuste rápido desde la lista" }, userName);
  };

  return (
    <li className={cn("rounded-3xl bg-white p-3 ring-1 ring-black/[0.06]", !p.visible && "opacity-70")}>
      <div className="flex gap-3">
        <ProductImage product={p} className="size-14 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-neutral-500">
            {p.code && <span>{p.code}</span>}
            <Badge tone={STOCK_STATUS_META[status].tone === "red" ? "red" : STOCK_STATUS_META[status].tone === "amber" ? "amber" : STOCK_STATUS_META[status].tone === "green" ? "green" : "gray"}>
              {STOCK_STATUS_META[status].emoji} {status === "sin_control" ? "Sin cargar" : `${stock} u.`}
            </Badge>
            {!p.visible && <Badge tone="gray">Oculto</Badge>}
            {p.requiresConsultation && <Badge tone="teal">Asesoramiento</Badge>}
            {hasVariants && <Badge tone="violet">{p.variants.length} variantes</Badge>}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {canEdit && (
            <Link href={adminPath(`/productos/${p.id}`)} className="grid size-9 place-items-center rounded-full text-neutral-500 hover:bg-black/5" aria-label={`Editar ${p.name}`}>
              <Pencil className="size-4" />
            </Link>
          )}
          {canEdit && (
            <button type="button" onClick={() => upsert("products", { ...p, visible: !p.visible, updatedAt: new Date().toISOString() })} className="grid size-9 place-items-center rounded-full text-neutral-500 hover:bg-black/5" aria-label={p.visible ? "Ocultar de la tienda" : "Mostrar en la tienda"} title={p.visible ? "Ocultar" : "Mostrar"}>
              {p.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </button>
          )}
        </div>
      </div>

      {hasVariants ? (
        <p className="mt-2 text-xs text-neutral-500">
          Precios desde {formatMoney(Math.min(...p.variants.map((v) => v.price ?? Infinity)) === Infinity ? null : Math.min(...p.variants.map((v) => v.price ?? Infinity)))} · <Link href={adminPath(`/productos/${p.id}`)} className="font-semibold text-vet-primary-dark">editar variantes, precios y stock</Link>
        </p>
      ) : (
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <label className="flex h-11 items-center gap-1.5 rounded-2xl bg-vet-surface px-3 text-sm">
            <span className="text-neutral-500">$</span>
            <span className="sr-only">Precio de {p.name}</span>
            <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))} onBlur={savePrice} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} inputMode="numeric" placeholder="Consultar" disabled={!canPrice} className="w-full min-w-0 bg-transparent font-semibold tabular-nums outline-none disabled:text-neutral-500" />
          </label>
          <div className="flex h-11 items-center rounded-2xl bg-vet-surface" role="group" aria-label={`Stock de ${p.name}`}>
            <button type="button" onClick={() => setStock(-1, "salida")} disabled={!p.stock} className="grid size-11 place-items-center text-neutral-600 disabled:opacity-30" aria-label="Restar una unidad"><Minus className="size-4" /></button>
            <input value={stockInput} onChange={(e) => setStockInput(e.target.value.replace(/[^\d]/g, ""))} onBlur={() => stockInput !== "" && Number(stockInput) !== p.stock && setStock(Number(stockInput))} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} inputMode="numeric" placeholder="—" aria-label="Unidades en stock" className="w-full min-w-0 bg-transparent text-center font-semibold tabular-nums outline-none" />
            <button type="button" onClick={() => setStock(1, "entrada")} className="grid size-11 place-items-center text-neutral-600" aria-label="Sumar una unidad"><Plus className="size-4" /></button>
          </div>
        </div>
      )}
    </li>
  );
}
