"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { LoyaltyReward, LoyaltySettings } from "@/lib/vet/types";
import { formatMoney, uid } from "@/lib/vet/domain/format";
import { getCustomerTier } from "@/lib/vet/domain/loyalty";
import { useCollection, useSettings, useVetData } from "@/lib/vet/client/store";
import { PageHeader, Panel } from "@/components/veterinaria/admin/ui";
import { RequirePermission } from "@/components/veterinaria/admin/AdminShell";
import { Button, Input, Select, Toggle } from "@/components/veterinaria/ui/primitives";

export default function FidelizacionPage() {
  const settings = useSettings();
  const save = useVetData((s) => s.saveSettings);
  const customers = useCollection("customers");
  const orders = useCollection("orders");
  const [l, setL] = useState<LoyaltySettings>(settings.loyalty);
  useEffect(() => setL(settings.loyalty), [settings.loyalty]);
  const tierCounts = l.tiers.map((t) => ({ t, n: customers.items.filter((c) => getCustomerTier(c, orders.items, l).id === t.id).length }));
  const setReward = (i: number, r: Partial<LoyaltyReward>) => setL({ ...l, rewards: l.rewards.map((x, k) => (k === i ? { ...x, ...r } : x)) });

  return (
    <RequirePermission perm="promotions.manage">
      <PageHeader title="Fidelización" subtitle="Puntos, beneficios y niveles internos de clientes." actions={<Button onClick={async () => { await save({ ...settings, loyalty: l }); toast.success("Guardado"); }}>Guardar cambios</Button>} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Puntos">
          <Toggle checked={l.enabled} onChange={(v) => setL({ ...l, enabled: v })} label="Programa de puntos activo" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Input label="Cada ($ gastados)" type="number" inputMode="numeric" value={l.amountPerStep} onChange={(e) => setL({ ...l, amountPerStep: Number(e.target.value) || 0 })} />
            <Input label="Se suman (puntos)" type="number" inputMode="numeric" value={l.pointsPerStep} onChange={(e) => setL({ ...l, pointsPerStep: Number(e.target.value) || 0 })} />
            <Input label="Valor de 1 punto al canjear ($)" type="number" step="0.1" value={l.pointValue} onChange={(e) => setL({ ...l, pointValue: Number(e.target.value) || 0 })} />
            <Input label="Período para niveles (días)" type="number" value={l.windowDays} onChange={(e) => setL({ ...l, windowDays: Number(e.target.value) || 0 })} />
          </div>
          <p className="mt-3 rounded-2xl bg-vet-tint p-3 text-sm text-vet-primary-dark">
            Ejemplo: una compra de {formatMoney(15000)} suma <strong>{Math.floor(15000 / Math.max(1, l.amountPerStep)) * l.pointsPerStep} puntos</strong>. Los puntos se acreditan cuando el pedido se marca como entregado.
          </p>
        </Panel>

        <Panel title="Beneficios canjeables" action={<Button size="sm" variant="secondary" onClick={() => setL({ ...l, rewards: [...l.rewards, { id: uid("r_"), name: "", points: 500, kind: "beneficio", active: true }] })}><Plus className="size-4" /> Agregar</Button>}>
          <ul className="space-y-2">
            {l.rewards.map((r, i) => (
              <li key={r.id} className="grid grid-cols-2 gap-2 rounded-2xl bg-vet-surface p-3">
                <Input label="Beneficio" className="col-span-2" value={r.name} onChange={(e) => setReward(i, { name: e.target.value })} />
                <Input label="Puntos" type="number" value={r.points} onChange={(e) => setReward(i, { points: Number(e.target.value) || 0 })} />
                <Select label="Tipo" value={r.kind} onChange={(e) => setReward(i, { kind: e.target.value as LoyaltyReward["kind"] })}>
                  <option value="descuento_fijo">Descuento $</option>
                  <option value="descuento_porcentaje">Descuento %</option>
                  <option value="producto">Producto</option>
                  <option value="servicio">Servicio</option>
                  <option value="beneficio">Otro beneficio</option>
                </Select>
                <div className="col-span-2 flex items-center justify-between">
                  <Toggle checked={r.active} onChange={(v) => setReward(i, { active: v })} label="Activo" />
                  <button type="button" onClick={() => setL({ ...l, rewards: l.rewards.filter((_, k) => k !== i) })} className="grid size-10 place-items-center rounded-full text-red-600 hover:bg-red-50" aria-label="Quitar beneficio"><Trash2 className="size-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Niveles internos" className="lg:col-span-2">
          <p className="mb-3 text-sm text-neutral-600">Son categorías <strong>internas</strong> para asignar beneficios: no se muestran como ranking público. Un cliente sube de nivel según sus pedidos o gasto en el período.</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {l.tiers.map((t, i) => (
              <div key={t.id} className="rounded-2xl bg-vet-surface p-3">
                <Input label="Nombre" value={t.name} onChange={(e) => setL({ ...l, tiers: l.tiers.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input label="Pedidos mín." type="number" value={t.minOrders} onChange={(e) => setL({ ...l, tiers: l.tiers.map((x, k) => (k === i ? { ...x, minOrders: Number(e.target.value) || 0 } : x)) })} />
                  <Input label="Gasto mín. ($)" type="number" value={t.minSpent} onChange={(e) => setL({ ...l, tiers: l.tiers.map((x, k) => (k === i ? { ...x, minSpent: Number(e.target.value) || 0 } : x)) })} />
                  <Input label="Multiplicador de puntos" type="number" step="0.05" className="col-span-2" value={t.pointsMultiplier} onChange={(e) => setL({ ...l, tiers: l.tiers.map((x, k) => (k === i ? { ...x, pointsMultiplier: Number(e.target.value) || 1 } : x)) })} />
                </div>
                <Input label="Beneficios (separados por coma)" className="mt-2" value={t.benefits.join(", ")} onChange={(e) => setL({ ...l, tiers: l.tiers.map((x, k) => (k === i ? { ...x, benefits: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : x)) })} />
                <p className="mt-2 text-xs text-neutral-500">{tierCounts.find((x) => x.t.id === t.id)?.n ?? 0} clientes hoy</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </RequirePermission>
  );
}
