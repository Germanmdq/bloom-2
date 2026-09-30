"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Phone, Plus, UsersRound } from "lucide-react";
import { toast } from "sonner";
import type { Customer, LoyaltyTierId } from "@/lib/vet/types";
import { formatDate, formatMoney, normalizeText, uid } from "@/lib/vet/domain/format";
import { getCustomerTier } from "@/lib/vet/domain/loyalty";
import { SPECIES_META, ORDER_STATUS } from "@/lib/vet/domain/labels";
import { waLink } from "@/lib/vet/domain/whatsapp";
import { can } from "@/lib/vet/domain/permissions";
import { useCollection, useSettings, useVetData } from "@/lib/vet/client/store";
import { useStaffRole } from "@/lib/vet/client/session";
import { Badge, Button, EmptyState, Input, Select, Sheet, Skeleton, Textarea, Toggle } from "../ui/primitives";
import { Chips, PageHeader, SearchBox } from "./ui";

type Seg = "todos" | LoyaltyTierId | "sin_compras" | "promos";

export function CustomersAdmin() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const customers = useCollection("customers");
  const orders = useCollection("orders");
  const pets = useCollection("pets");
  const settings = useSettings();
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<Seg>("todos");
  const [open, setOpen] = useState<Customer | null>(null);

  useEffect(() => {
    if (params.get("nuevo") === "1") {
      const now = new Date().toISOString();
      setOpen({ id: uid("c_"), name: "", phone: "", points: 0, favoriteIds: [], marketingOptIn: false, createdAt: now, updatedAt: now });
      router.replace(pathname);
    }
  }, []);

  const stats = useMemo(() => {
    const m = new Map<string, { orders: number; spent: number; last?: string }>();
    for (const o of orders.items) {
      if (!o.customerId || o.status === "cancelado") continue;
      const s = m.get(o.customerId) ?? { orders: 0, spent: 0 };
      s.orders++;
      s.spent += o.totals.total;
      if (!s.last || o.createdAt > s.last) s.last = o.createdAt;
      m.set(o.customerId, s);
    }
    return m;
  }, [orders.items]);

  const list = useMemo(() => {
    const t = normalizeText(q);
    return customers.items
      .map((c) => ({ c, s: stats.get(c.id) ?? { orders: 0, spent: 0 }, tier: getCustomerTier(c, orders.items, settings.loyalty) }))
      .filter(({ c, s, tier }) => {
        if (seg === "sin_compras" && s.orders > 0) return false;
        if (seg === "promos" && !c.marketingOptIn) return false;
        if ((seg === "nuevo" || seg === "frecuente" || seg === "vip") && tier.id !== seg) return false;
        return !t || normalizeText(`${c.name} ${c.phone} ${c.email ?? ""}`).includes(t);
      })
      .sort((a, b) => b.s.spent - a.s.spent);
  }, [customers.items, stats, q, seg, orders.items, settings.loyalty]);

  return (
    <div>
      <PageHeader title="Clientes" subtitle={`${customers.items.length} clientes · los niveles son internos, el cliente no los ve como ranking`} actions={<Button onClick={() => { const now = new Date().toISOString(); setOpen({ id: uid("c_"), name: "", phone: "", points: 0, favoriteIds: [], marketingOptIn: false, createdAt: now, updatedAt: now }); }}><Plus className="size-4" /> Nuevo cliente</Button>} />
      <div className="mb-3"><SearchBox value={q} onChange={setQ} placeholder="Nombre, teléfono o email" label="Buscar clientes" /></div>
      <Chips label="Segmento" value={seg} onChange={setSeg} options={[
        { value: "todos", label: "Todos" },
        ...settings.loyalty.tiers.map((t) => ({ value: t.id as Seg, label: t.name })),
        { value: "sin_compras", label: "Sin compras" },
        { value: "promos", label: "Aceptan promociones" },
      ]} />
      <div className="mt-4">
        {!customers.ready ? <Skeleton className="h-64" /> : list.length ? (
          <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {list.map(({ c, s, tier }) => (
              <li key={c.id}>
                <button type="button" onClick={() => setOpen(c)} className="flex w-full items-center gap-3 rounded-3xl bg-white p-4 text-left ring-1 ring-black/[0.06] hover:ring-vet-primary/30">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-vet-tint font-bold text-vet-primary-dark">{c.name.slice(0, 1)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{c.name}</span>
                    <span className="block text-xs text-neutral-500">{c.phone} · {s.orders} pedidos · {pets.items.filter((p) => p.customerId === c.id).length} mascotas</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-bold tabular-nums">{formatMoney(s.spent)}</span>
                    <Badge tone={tier.id === "vip" ? "violet" : tier.id === "frecuente" ? "teal" : "gray"}>{tier.name}</Badge>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={<UsersRound className="size-6" />} title="No hay clientes con este filtro" />}
      </div>
      {open && <CustomerSheet customer={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function CustomerSheet({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const { role } = useStaffRole();
  const orders = useCollection("orders");
  const pets = useCollection("pets");
  const settings = useSettings();
  const upsert = useVetData((s) => s.upsert);
  const [c, setC] = useState(customer);
  const [pointsDelta, setPointsDelta] = useState("");
  const isNew = !orders.items.some((o) => o.customerId === c.id) && !c.name;
  const history = orders.items.filter((o) => o.customerId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const myPets = pets.items.filter((p) => p.customerId === c.id);
  const canEdit = can(role, "customers.manage");

  return (
    <Sheet
      open
      onClose={onClose}
      title={isNew ? "Nuevo cliente" : c.name}
      wide
      footer={
        <div className="flex gap-2">
          {c.phone && <a href={waLink(c.phone, `Hola ${c.name.split(" ")[0]}, te escribimos de ${settings.business.name}.`)} target="_blank" rel="noopener noreferrer" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#128C4B] text-white" aria-label="WhatsApp"><MessageCircle className="size-5" /></a>}
          {c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white ring-1 ring-black/10" aria-label="Llamar"><Phone className="size-5" /></a>}
          {canEdit && (
            <Button size="lg" className="flex-1" onClick={async () => {
              if (c.name.trim().length < 2 || c.phone.replace(/\D/g, "").length < 8) return toast.error("Nombre y teléfono son obligatorios");
              const delta = Number(pointsDelta) || 0;
              await upsert("customers", { ...c, points: Math.max(0, c.points + delta), updatedAt: new Date().toISOString() });
              toast.success("Cliente guardado");
              onClose();
            }}>Guardar</Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Nombre y apellido" value={c.name} disabled={!canEdit} onChange={(e) => setC({ ...c, name: e.target.value })} />
          <Input label="Teléfono / WhatsApp" type="tel" value={c.phone} disabled={!canEdit} onChange={(e) => setC({ ...c, phone: e.target.value })} />
          <Input label="Email" type="email" value={c.email ?? ""} disabled={!canEdit} onChange={(e) => setC({ ...c, email: e.target.value || undefined })} />
          <Input label="Dirección" value={c.address?.street ?? ""} disabled={!canEdit} onChange={(e) => setC({ ...c, address: { ...c.address, street: e.target.value } })} />
          <Select label="Nivel (interno)" value={c.tierOverride ?? ""} disabled={!canEdit} onChange={(e) => setC({ ...c, tierOverride: (e.target.value || undefined) as LoyaltyTierId | undefined })} hint="Automático según compras, o fijalo a mano">
            <option value="">Automático</option>
            {settings.loyalty.tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Input label={`Puntos (${c.points}) · sumar o restar`} type="number" value={pointsDelta} disabled={!canEdit} onChange={(e) => setPointsDelta(e.target.value)} placeholder="Ej: 100 o -50" />
          <div className="sm:col-span-2"><Toggle checked={c.marketingOptIn} disabled={!canEdit} onChange={(v) => setC({ ...c, marketingOptIn: v })} label="Acepta recibir promociones" description="Solo se le envían promociones y recordatorios si está activado." /></div>
          <Textarea label="Notas internas" className="sm:col-span-2" value={c.notes ?? ""} disabled={!canEdit} onChange={(e) => setC({ ...c, notes: e.target.value || undefined })} />
        </div>

        {myPets.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-bold">Mascotas</h3>
            <div className="flex flex-wrap gap-2">
              {myPets.map((p) => <span key={p.id} className="rounded-2xl bg-vet-surface px-3 py-2 text-sm">{SPECIES_META[p.species].emoji} <strong>{p.name}</strong>{p.breed ? ` · ${p.breed}` : ""}{p.birthDate ? ` · 🎂 ${formatDate(p.birthDate, { day: "numeric", month: "short" })}` : ""}</span>)}
            </div>
          </div>
        )}
        {history.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-bold">Pedidos ({history.length})</h3>
            <ul className="divide-y divide-black/5 text-sm">
              {history.slice(0, 10).map((o) => (
                <li key={o.id} className="flex justify-between gap-2 py-2"><span>#{o.number} · {formatDate(o.createdAt)} · {ORDER_STATUS[o.status].label}</span><span className="font-semibold tabular-nums">{formatMoney(o.totals.total)}</span></li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-neutral-500">Cliente desde {formatDate(c.createdAt, { day: "numeric", month: "long", year: "numeric" })}{c.demo ? " · dato de ejemplo" : ""}</p>
      </div>
    </Sheet>
  );
}
