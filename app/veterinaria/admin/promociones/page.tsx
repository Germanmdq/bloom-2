"use client";
import { Suspense, useState } from "react";
import { Package, TicketPercent, Trash2 } from "lucide-react";
import type { Combo, Coupon } from "@/lib/vet/types";
import { formatDate, formatMoney, slugify, uid } from "@/lib/vet/domain/format";
import { comboRegularPrice } from "@/lib/vet/domain/pricing";
import { createProductSearch } from "@/lib/vet/domain/search";
import { useCollection } from "@/lib/vet/client/store";
import { CrudSection } from "@/components/veterinaria/admin/CrudSection";
import { Chips, PageHeader, SearchBox } from "@/components/veterinaria/admin/ui";
import { RequirePermission } from "@/components/veterinaria/admin/AdminShell";
import { Badge, Select } from "@/components/veterinaria/ui/primitives";

const TYPE = { porcentaje: "% descuento", fijo: "$ descuento", envio_gratis: "Envío gratis", dos_por_uno: "2x1" } as const;
const AUDIENCE = { todos: "Todos", primera_compra: "Primera compra", recurrentes: "Clientes que vuelven", vip: "Clientes VIP" } as const;

export default function PromocionesAdmin() {
  const [tab, setTab] = useState<"cupones" | "combos">("cupones");
  const categories = useCollection("categories");
  const products = useCollection("products");
  const services = useCollection("services");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <RequirePermission perm="promotions.manage">
      <PageHeader title="Promociones y combos" subtitle="Cupones con código, promociones automáticas y combos." />
      <div className="mb-4">
        <Chips label="Sección" value={tab} onChange={setTab} options={[{ value: "cupones", label: "Cupones y promociones" }, { value: "combos", label: "Combos" }]} />
      </div>
      <Suspense>
        {tab === "cupones" ? (
          <CrudSection<"coupons">
            collection="coupons"
            newLabel="Nueva promoción"
            emptyIcon={<TicketPercent className="size-6" />}
            emptyText="Creá un cupón (con código) o una promoción automática (sin código)."
            sort={(a, b) => Number(b.active) - Number(a.active) || b.createdAt.localeCompare(a.createdAt)}
            blank={(): Coupon => ({ id: uid("cp_"), code: "", title: "", type: "porcentaje", value: 10, usedCount: 0, productIds: [], categoryIds: [], audience: "todos", active: true, public: true, createdAt: new Date().toISOString() })}
            validate={(c) => (!c.title.trim() ? "Poné un título" : c.type === "porcentaje" && (c.value <= 0 || c.value > 100) ? "El porcentaje debe estar entre 1 y 100" : null)}
            beforeSave={(c) => ({ ...c, code: c.code?.trim().toUpperCase() || undefined })}
            fields={(c) => [
              { key: "title", label: "Título visible", type: "text", required: true, placeholder: "Ej: 10% en tu primera compra" },
              { key: "code", label: "Código", type: "text", hint: "Vacío = se aplica sola en el carrito" },
              { key: "type", label: "Tipo", type: "select", options: Object.entries(TYPE).map(([value, label]) => ({ value, label })) },
              ...(c.type === "porcentaje" || c.type === "fijo" ? [{ key: "value" as const, label: c.type === "porcentaje" ? "Porcentaje (%)" : "Monto ($)", type: "number" as const, min: 0 }] : []),
              { key: "minPurchase", label: "Compra mínima ($)", type: "money", nullable: true },
              { key: "maxUses", label: "Usos máximos", type: "number", nullable: true, hint: "Vacío = ilimitado" },
              { key: "startsAt", label: "Desde", type: "date" },
              { key: "endsAt", label: "Hasta (vencimiento)", type: "date" },
              { key: "audience", label: "Para quién", type: "select", options: Object.entries(AUDIENCE).map(([value, label]) => ({ value, label })) },
              { key: "categoryIds", label: "Solo en estas categorías (vacío = todas)", type: "multi", options: categories.items.map((x) => ({ value: x.id, label: x.name })) },
              { key: "description", label: "Condiciones / descripción", type: "textarea" },
              { key: "active", label: "Activa", type: "toggle" },
              { key: "public", label: "Mostrar en la página de promociones", type: "toggle" },
            ]}
            extra={(c, set) => <ProductPicker ids={c.productIds} onChange={(ids) => set({ ...c, productIds: ids })} label="Solo en estos productos (opcional)" />}
            row={(c) => {
              const expired = c.endsAt && c.endsAt < today;
              return {
                title: c.title,
                subtitle: [c.code ? `Código ${c.code}` : "Automática", TYPE[c.type] + (c.type === "porcentaje" ? ` ${c.value}%` : c.type === "fijo" ? ` ${formatMoney(c.value)}` : ""), c.endsAt ? `vence ${formatDate(c.endsAt)}` : null].filter(Boolean).join(" · "),
                badges: (
                  <>
                    <Badge tone={c.active && !expired ? "green" : "gray"}>{expired ? "Vencida" : c.active ? "Activa" : "Pausada"}</Badge>
                    <Badge tone="gray">{c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""} usos</Badge>
                    {c.audience !== "todos" && <Badge tone="violet">{AUDIENCE[c.audience]}</Badge>}
                    {c.demo && <Badge tone="amber">Ejemplo</Badge>}
                  </>
                ),
              };
            }}
          />
        ) : (
          <CrudSection<"combos">
            collection="combos"
            newLabel="Nuevo combo"
            emptyIcon={<Package className="size-6" />}
            blank={(): Combo => ({ id: uid("cb_"), slug: "", name: "", items: [], price: null, active: true, createdAt: new Date().toISOString() })}
            validate={(c) => (!c.name.trim() ? "Poné un nombre" : c.items.length < 2 ? "Un combo necesita al menos 2 ítems" : null)}
            beforeSave={(c) => ({ ...c, slug: c.slug || slugify(c.name) })}
            fields={[
              { key: "name", label: "Nombre", type: "text", required: true, placeholder: "Ej: Combo baño + corte" },
              { key: "price", label: "Precio del combo", type: "money", nullable: true },
              { key: "description", label: "Descripción", type: "textarea" },
              { key: "active", label: "Activo", type: "toggle" },
            ]}
            extra={(c, set) => {
              const regular = comboRegularPrice(c, products.items, services.items);
              return (
                <div className="space-y-3">
                  <ProductPicker ids={c.items.filter((i) => i.productId).map((i) => i.productId!)} onChange={(ids) => set({ ...c, items: [...c.items.filter((i) => i.serviceId), ...ids.map((id) => ({ productId: id, quantity: 1 }))] })} label="Productos del combo" />
                  <Select label="Agregar un servicio" value="" onChange={(e) => e.target.value && set({ ...c, items: [...c.items, { serviceId: e.target.value, quantity: 1 }] })}>
                    <option value="">Elegir servicio…</option>
                    {services.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                  {c.items.filter((i) => i.serviceId).map((i, k) => (
                    <div key={k} className="flex items-center justify-between rounded-2xl bg-vet-surface px-3 py-2 text-sm">
                      {services.items.find((s) => s.id === i.serviceId)?.name}
                      <button type="button" onClick={() => set({ ...c, items: c.items.filter((x) => x !== i) })} aria-label="Quitar servicio" className="text-red-600"><Trash2 className="size-4" /></button>
                    </div>
                  ))}
                  <p className="rounded-2xl bg-vet-tint p-3 text-sm text-vet-primary-dark">
                    Precio individual: <strong>{regular != null ? formatMoney(regular) : "—"}</strong> · Precio combo: <strong>{formatMoney(c.price)}</strong>
                    {regular != null && c.price != null && regular > c.price && <> · Ahorro: <strong>{formatMoney(regular - c.price)}</strong></>}
                  </p>
                </div>
              );
            }}
            row={(c) => ({
              title: c.name,
              subtitle: `${c.items.length} ítems · ${formatMoney(c.price)}`,
              badges: <><Badge tone={c.active ? "green" : "gray"}>{c.active ? "Activo" : "Pausado"}</Badge>{c.items.some((i) => i.serviceId) && <Badge tone="teal">Con servicios (se reserva)</Badge>}{c.demo && <Badge tone="amber">Ejemplo</Badge>}</>,
            })}
          />
        )}
      </Suspense>
    </RequirePermission>
  );
}

function ProductPicker({ ids, onChange, label }: { ids: string[]; onChange: (ids: string[]) => void; label: string }) {
  const products = useCollection("products");
  const categories = useCollection("categories");
  const [q, setQ] = useState("");
  const results = q.trim() && products.ready ? createProductSearch(products.items, categories.items)(q, 6).map((r) => r.item) : [];
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold text-vet-ink/80">{label}</p>
      <SearchBox value={q} onChange={setQ} placeholder="Buscar producto" label={label} />
      {results.length > 0 && (
        <ul className="mt-1 divide-y divide-black/5 rounded-2xl ring-1 ring-black/[0.06]">
          {results.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => { if (!ids.includes(p.id)) onChange([...ids, p.id]); setQ(""); }} className="w-full px-3 py-2 text-left text-sm hover:bg-vet-tint/40">{p.name}</button>
            </li>
          ))}
        </ul>
      )}
      {ids.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ids.map((id) => (
            <button key={id} type="button" onClick={() => onChange(ids.filter((x) => x !== id))} className="h-8 rounded-full bg-vet-tint px-3 text-xs font-semibold text-vet-primary-dark" aria-label={`Quitar ${products.items.find((p) => p.id === id)?.name}`}>
              {products.items.find((p) => p.id === id)?.name ?? id} ✕
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
