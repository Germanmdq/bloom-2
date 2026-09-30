"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Boxes, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { Product, StockMovementType } from "@/lib/vet/types";
import { adminPath } from "@/lib/vet/config/integrations";
import { formatDateTime } from "@/lib/vet/domain/format";
import { getStockStatus, totalStock } from "@/lib/vet/domain/stock";
import { createProductSearch } from "@/lib/vet/domain/search";
import { useCollection } from "@/lib/vet/client/store";
import { useStaffRole } from "@/lib/vet/client/session";
import { adjustStock } from "@/lib/vet/client/actions";
import { PageHeader, Panel, SearchBox, StatCard } from "@/components/veterinaria/admin/ui";
import { RequirePermission } from "@/components/veterinaria/admin/AdminShell";
import { Badge, Button, EmptyState, Input, Select } from "@/components/veterinaria/ui/primitives";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<StockMovementType, string> = { entrada: "Entrada", salida: "Salida", ajuste: "Ajuste", venta: "Venta", devolucion: "Devolución" };

export default function StockPage() {
  const { name } = useStaffRole();
  const products = useCollection("products");
  const categories = useCollection("categories");
  const movements = useCollection("stockMovements");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Product | null>(null);
  const [f, setF] = useState<{ type: StockMovementType; qty: string; variantId: string; reason: string }>({ type: "entrada", qty: "", variantId: "", reason: "" });

  const summary = useMemo(() => {
    const s = { disponible: 0, poco: 0, sin_stock: 0, sin_control: 0 };
    for (const p of products.items) if (p.visible) s[getStockStatus(p)]++;
    return s;
  }, [products.items]);
  const results = q.trim() && products.ready ? createProductSearch(products.items, categories.items)(q, 8).map((r) => r.item) : [];
  const recent = [...movements.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
  const pname = (id: string) => products.items.find((p) => p.id === id)?.name ?? id;

  const submit = async () => {
    if (!sel) return;
    const n = Number(f.qty);
    if (!Number.isFinite(n) || n < 0 || f.qty === "") return toast.error("Ingresá una cantidad");
    if (sel.variants.length && !f.variantId) return toast.error("Elegí la variante");
    const quantity = f.type === "entrada" ? n : f.type === "salida" ? -n : n;
    const updated = await adjustStock(sel, { type: f.type, quantity, variantId: f.variantId || undefined, reason: f.reason || undefined }, name);
    toast.success(`Stock actualizado: ${totalStock(updated)} u.`, { description: sel.name });
    setSel(updated);
    setF({ ...f, qty: "", reason: "" });
  };

  return (
    <RequirePermission perm="stock.manage">
      <PageHeader title="Stock" subtitle="Entradas, salidas, ajustes e historial de movimientos." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="🟢 Disponibles" value={String(summary.disponible)} href={adminPath("/productos?stock=disponible")} />
        <StatCard label="🟡 Poco stock" value={String(summary.poco)} tone={summary.poco ? "warn" : "default"} href={adminPath("/productos?stock=poco")} />
        <StatCard label="🔴 Sin stock" value={String(summary.sin_stock)} tone={summary.sin_stock ? "danger" : "default"} href={adminPath("/productos?stock=sin_stock")} />
        <StatCard label="⚪ Sin cargar" value={String(summary.sin_control)} hint="cargalos para activar alertas" href={adminPath("/productos?stock=sin_control")} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Registrar movimiento">
          <SearchBox value={q} onChange={setQ} placeholder="Buscar producto o escanear código" label="Buscar producto para stock" />
          {results.length > 0 && (
            <ul className="mt-1 divide-y divide-black/5 rounded-2xl ring-1 ring-black/[0.06]">
              {results.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => { setSel(p); setQ(""); setF({ ...f, variantId: p.variants[0]?.id ?? "" }); }} className="flex w-full justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-vet-tint/40">
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 text-neutral-500 tabular-nums">{totalStock(p) ?? "—"} u.</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {sel ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-vet-surface p-3">
                <p className="font-semibold">{sel.name}</p>
                <p className="text-sm text-neutral-600">Stock actual: <strong>{totalStock(sel) ?? "sin cargar"}</strong> · mínimo {sel.minStock}</p>
              </div>
              <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Tipo de movimiento">
                {([["entrada", ArrowDownToLine], ["salida", ArrowUpFromLine], ["ajuste", SlidersHorizontal]] as const).map(([t, Icon]) => (
                  <button key={t} type="button" role="radio" aria-checked={f.type === t} onClick={() => setF({ ...f, type: t })} className={cn("flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-semibold ring-1", f.type === t ? "bg-vet-ink text-white ring-vet-ink" : "bg-white ring-black/10")}>
                    <Icon className="size-4" /> {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
              {sel.variants.length > 0 && (
                <Select label="Variante" value={f.variantId} onChange={(e) => setF({ ...f, variantId: e.target.value })}>
                  {sel.variants.map((v) => <option key={v.id} value={v.id}>{v.label} · stock {v.stock ?? "—"}</option>)}
                </Select>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Input label={f.type === "ajuste" ? "Stock real (conteo)" : "Cantidad"} type="number" inputMode="numeric" min={0} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />
                <Input label="Motivo" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder={f.type === "entrada" ? "Compra a proveedor" : f.type === "salida" ? "Rotura, uso interno…" : "Conteo"} />
              </div>
              <Button size="lg" className="w-full" onClick={submit}>Registrar {TYPE_LABEL[f.type].toLowerCase()}</Button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">Buscá un producto para cargar una entrada (compra), una salida o un ajuste por conteo. Todo queda en el historial.</p>
          )}
        </Panel>

        <Panel title="Historial de movimientos">
          {recent.length ? (
            <ul className="divide-y divide-black/5 text-sm">
              {recent.map((m) => (
                <li key={m.id} className="flex items-start gap-3 py-2">
                  <Badge tone={m.quantity >= 0 ? "green" : "red"}>{m.quantity >= 0 ? "+" : ""}{m.quantity}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{pname(m.productId)}</p>
                    <p className="text-xs text-neutral-500">{TYPE_LABEL[m.type]} · queda {m.resultingStock} · {formatDateTime(m.createdAt)}{m.userName ? ` · ${m.userName}` : ""}{m.reason ? ` · ${m.reason}` : ""}</p>
                  </div>
                  {m.orderId && <Link href={adminPath(`/pedidos?id=${m.orderId}`)} className="text-xs font-semibold text-vet-primary-dark">Pedido</Link>}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Boxes className="size-6" />} title="Sin movimientos todavía" text="Las ventas descuentan stock solas cuando el producto tiene stock cargado." />
          )}
        </Panel>
      </div>
    </RequirePermission>
  );
}
