"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Bell, Cake, CalendarCheck, ChevronRight, Gift, Heart, LogOut, PawPrint, Pencil, Plus, Receipt, Ticket, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import type { Pet, PetSex, Species } from "@/lib/vet/types";
import { vetPath } from "@/lib/vet/config/integrations";
import { formatDate, formatLongDay, formatMoney } from "@/lib/vet/domain/format";
import { ageFromBirthDate, nextBirthday, daysBetween } from "@/lib/vet/domain/dates";
import { APPOINTMENT_STATUS, ORDER_STATUS, PET_SPECIES, SPECIES_META } from "@/lib/vet/domain/labels";
import { rewardProgress } from "@/lib/vet/domain/loyalty";
import { checkCoupon } from "@/lib/vet/domain/pricing";
import { useCollection, useSettings, useVetData } from "@/lib/vet/client/store";
import { useCurrentCustomer, useHydrated } from "@/lib/vet/client/session";
import { findOrCreateCustomer, savePet, signOut } from "@/lib/vet/client/actions";
import { notificationPermission, requestNotifications } from "@/lib/vet/client/notifications";
import { uploadImage } from "@/lib/vet/client/images";
import { SignInCard } from "./SignInCard";
import { RebuyStrip } from "./RebuyStrip";
import { Badge, Button, Card, EmptyState, Input, Select, Sheet, Skeleton, Textarea, Toggle } from "../ui/primitives";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "resumen", label: "Resumen", icon: UserRound },
  { id: "pedidos", label: "Pedidos", icon: Receipt },
  { id: "turnos", label: "Turnos", icon: CalendarCheck },
  { id: "mascotas", label: "Mascotas", icon: PawPrint },
  { id: "datos", label: "Mis datos", icon: Pencil },
] as const;

export function AccountView() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") ?? "resumen") as (typeof TABS)[number]["id"];
  const { customer, ready } = useCurrentCustomer();

  if (!hydrated || !ready) return <div className="mx-auto max-w-4xl px-4 pt-6"><Skeleton className="h-48" /></div>;
  if (!customer) {
    return (
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
        <SignInCard />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-500">Hola,</p>
          <h1 className="font-vet-display text-3xl font-extrabold tracking-[-0.01em]">{customer.name.split(" ")[0]} 👋</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { signOut(); toast("Cerraste sesión"); }}>
          <LogOut className="size-4" /> Salir
        </Button>
      </div>

      <nav className="vet-scroll-x -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Secciones de la cuenta">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => router.replace(vetPath(`/cuenta?tab=${t.id}`), { scroll: false })} aria-current={tab === t.id ? "page" : undefined} className={cn("inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ring-1 transition", tab === t.id ? "bg-vet-ink text-white ring-vet-ink" : "bg-white ring-black/[0.08]")}>
            <t.icon className="size-4" /> {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-5">
        {tab === "resumen" && <Summary customerId={customer.id} />}
        {tab === "pedidos" && <Orders customerId={customer.id} />}
        {tab === "turnos" && <Appointments customerId={customer.id} />}
        {tab === "mascotas" && <Pets customerId={customer.id} />}
        {tab === "datos" && <Profile />}
      </div>
    </div>
  );
}

function Summary({ customerId }: { customerId: string }) {
  const settings = useSettings();
  const { customer } = useCurrentCustomer();
  const coupons = useCollection("coupons");
  const orders = useCollection("orders");
  const pets = useCollection("pets");
  const [perm, setPerm] = useState(notificationPermission());
  if (!customer) return null;
  const progress = rewardProgress(customer.points, settings.loyalty.rewards);
  const previous = orders.items.filter((o) => o.customerId === customerId && o.status !== "cancelado").length;
  const myCoupons = coupons.items.filter((c) => c.code && c.public && checkCoupon(c, { subtotal: Number.MAX_SAFE_INTEGER, lines: [{ available: true, lineTotal: 1, name: "", unitPrice: 1, quantity: 1 }], previousOrders: previous }).ok);
  const birthdays = pets.items
    .filter((p) => p.customerId === customerId)
    .map((p) => ({ p, next: nextBirthday(p.birthDate, new Date()) }))
    .filter((x) => x.next && daysBetween(new Date(), x.next) <= 30);

  return (
    <div className="space-y-4">
      {settings.loyalty.enabled && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-vet-primary to-vet-primary-dark p-5 text-white">
            <p className="text-sm text-white/80">Tus puntos</p>
            <p className="mt-1 font-vet-display text-4xl font-extrabold tabular-nums">{customer.points.toLocaleString("es-AR")}</p>
            {progress.next ? (
              <>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.progress * 100)} aria-label="Progreso hacia el próximo beneficio">
                  <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress.progress * 100}%` }} />
                </div>
                <p className="mt-2 text-sm text-white/90">Te faltan <strong>{progress.missing}</strong> puntos para conseguir «{progress.next.name}».</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-white/90">¡Tenés todos los beneficios disponibles!</p>
            )}
          </div>
          <div className="p-5">
            <p className="text-sm text-neutral-600">Cada {formatMoney(settings.loyalty.amountPerStep)} de compra sumás {settings.loyalty.pointsPerStep} puntos.</p>
            {progress.available.length > 0 && (
              <ul className="mt-3 space-y-2">
                {progress.available.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-2xl bg-vet-tint/60 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 font-semibold"><Gift className="size-4 text-vet-primary" /> {r.name}</span>
                    <Badge tone="green">Disponible</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}

      {birthdays.map(({ p, next }) => (
        <Card key={p.id} className="flex items-center gap-3 p-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#fdf0f3] text-vet-accent"><Cake className="size-6" /></span>
          <p className="text-sm">
            {daysBetween(new Date(), next!) === 0 ? <><strong>🎂 ¡Hoy es el cumpleaños de {p.name}!</strong> Pasá por el local: tenemos un mimo para {p.name}.</> : <>El cumpleaños de <strong>{p.name}</strong> es el {formatDate(next!, { day: "numeric", month: "long" })}.</>}
          </p>
        </Card>
      ))}

      {myCoupons.length > 0 && (
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-bold"><Ticket className="size-5 text-vet-primary" /> Tus cupones</h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {myCoupons.map((c) => (
              <li key={c.id} className="rounded-2xl border border-dashed border-vet-primary/40 p-3">
                <p className="text-sm font-bold">{c.title}</p>
                <p className="mt-1 font-mono text-sm font-bold tracking-wider text-vet-primary-dark">{c.code}</p>
                {c.endsAt && <p className="text-xs text-neutral-500">Vence el {formatDate(c.endsAt)}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <RebuyStrip />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href={vetPath("/favoritos")} className="flex items-center gap-3 rounded-3xl bg-white p-4 ring-1 ring-black/[0.06]">
          <Heart className="size-5 text-vet-accent" /> <span className="flex-1 font-semibold">Mis favoritos</span> <span className="text-sm text-neutral-500">{customer.favoriteIds.length}</span> <ChevronRight className="size-4 text-neutral-400" />
        </Link>
        {perm !== "unsupported" && settings.notifications.enabled && (
          <button type="button" disabled={perm === "granted"} onClick={async () => setPerm(await requestNotifications(["pedido_confirmado", "pedido_listo", "pedido_en_camino", "turno_confirmado", "turno_proximo", "recordatorios"], customerId))} className="flex items-center gap-3 rounded-3xl bg-white p-4 text-left ring-1 ring-black/[0.06] disabled:opacity-70">
            <Bell className="size-5 text-vet-primary" /> <span className="flex-1 font-semibold">{perm === "granted" ? "Notificaciones activadas" : "Activar notificaciones"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function Orders({ customerId }: { customerId: string }) {
  const orders = useCollection("orders");
  const list = orders.items.filter((o) => o.customerId === customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!orders.ready) return <Skeleton className="h-40" />;
  if (!list.length) return <EmptyState icon={<Receipt className="size-6" />} title="Todavía no hiciste pedidos" action={<Link className="font-semibold text-vet-primary-dark" href={vetPath("/tienda")}>Ir a la tienda</Link>} />;
  return (
    <ul className="space-y-2">
      {list.map((o) => (
        <li key={o.id}>
          <Link href={vetPath(`/pedido/${o.id}`)} className="flex items-center gap-3 rounded-3xl bg-white p-4 ring-1 ring-black/[0.06] transition hover:ring-vet-primary/30">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Pedido #{o.number} <span className="font-normal text-neutral-500">· {formatDate(o.createdAt)}</span></p>
              <p className="line-clamp-1 text-sm text-neutral-600">{o.items.map((i) => i.name).join(", ")}</p>
            </div>
            <div className="text-right">
              <p className="font-bold tabular-nums">{formatMoney(o.totals.total)}</p>
              <Badge tone={ORDER_STATUS[o.status].tone === "red" ? "red" : "teal"}>{ORDER_STATUS[o.status].label}</Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Appointments({ customerId }: { customerId: string }) {
  const appts = useCollection("appointments");
  const services = useCollection("services");
  const today = new Date().toISOString().slice(0, 10);
  const list = appts.items.filter((a) => a.customerId === customerId).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const upcoming = list.filter((a) => a.date >= today && ["pendiente", "confirmado"].includes(a.status)).reverse();
  const past = list.filter((a) => !upcoming.includes(a));
  if (!appts.ready) return <Skeleton className="h-40" />;
  const row = (a: (typeof list)[number]) => (
    <li key={a.id} className="flex items-center gap-3 rounded-3xl bg-white p-4 ring-1 ring-black/[0.06]">
      <CalendarCheck className="size-5 shrink-0 text-vet-primary" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{services.items.find((s) => s.id === a.serviceId)?.name} · {a.petName}</p>
        <p className="text-sm text-neutral-600">{formatLongDay(a.date)} · {a.time}</p>
      </div>
      <Badge tone={APPOINTMENT_STATUS[a.status].tone}>{APPOINTMENT_STATUS[a.status].label}</Badge>
    </li>
  );
  return (
    <div className="space-y-5">
      <Link href={vetPath("/turnos")} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-vet-primary font-bold text-white"><Plus className="size-5" /> Reservar un turno</Link>
      {upcoming.length > 0 && (<section><h2 className="mb-2 text-sm font-bold text-neutral-600">Próximos</h2><ul className="space-y-2">{upcoming.map(row)}</ul></section>)}
      {past.length > 0 && (<section><h2 className="mb-2 text-sm font-bold text-neutral-600">Historial</h2><ul className="space-y-2">{past.slice(0, 20).map(row)}</ul></section>)}
      {!list.length && <EmptyState icon={<CalendarCheck className="size-6" />} title="No tenés turnos todavía" />}
    </div>
  );
}

const EMPTY_PET = { name: "", species: "perro" as Species, breed: "", sex: "desconocido" as PetSex, birthDate: "", weightKg: "", notes: "", photo: "" };

function Pets({ customerId }: { customerId: string }) {
  const pets = useCollection("pets");
  const remove = useVetData((s) => s.remove);
  const [editing, setEditing] = useState<(typeof EMPTY_PET & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const list = pets.items.filter((p) => p.customerId === customerId);

  const open = (p?: Pet) => setEditing(p ? { id: p.id, name: p.name, species: p.species, breed: p.breed ?? "", sex: p.sex, birthDate: p.birthDate ?? "", weightKg: p.weightKg?.toString() ?? "", notes: p.notes ?? "", photo: p.photo ?? "" } : { ...EMPTY_PET });

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {list.map((p) => {
          const age = ageFromBirthDate(p.birthDate, new Date()) ?? p.approxAgeYears;
          return (
            <Card key={p.id} className="flex items-center gap-4 p-4">
              {p.photo ? <img src={p.photo} alt={p.name} className="size-16 rounded-2xl object-cover" /> : <span className="grid size-16 place-items-center rounded-2xl bg-vet-tint text-3xl" aria-hidden="true">{SPECIES_META[p.species].emoji}</span>}
              <div className="min-w-0 flex-1">
                <p className="font-vet-display text-lg font-bold">{p.name}</p>
                <p className="text-sm text-neutral-600">{SPECIES_META[p.species].label}{p.breed ? ` · ${p.breed}` : ""}{age != null ? ` · ${age} ${age === 1 ? "año" : "años"}` : ""}</p>
                {p.birthDate && <p className="text-xs text-neutral-500">🎂 {formatDate(p.birthDate, { day: "numeric", month: "long" })}</p>}
              </div>
              <button type="button" onClick={() => open(p)} className="grid size-10 place-items-center rounded-full hover:bg-black/5" aria-label={`Editar a ${p.name}`}><Pencil className="size-4" /></button>
            </Card>
          );
        })}
        <button type="button" onClick={() => open()} className="flex min-h-24 items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-vet-primary/30 text-sm font-bold text-vet-primary-dark hover:bg-vet-tint/40">
          <Plus className="size-5" /> Agregar mascota
        </button>
      </div>

      <Sheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Editar a ${editing.name}` : "Nueva mascota"}
        footer={
          <div className="flex gap-2">
            {editing?.id && (
              <Button variant="ghost" onClick={async () => { await remove("pets", editing.id!); setEditing(null); toast("Mascota eliminada"); }} aria-label="Eliminar mascota">
                <Trash2 className="size-4" />
              </Button>
            )}
            <Button
              className="flex-1"
              loading={saving}
              onClick={async () => {
                if (!editing?.name.trim()) return toast.error("Ingresá el nombre");
                setSaving(true);
                try {
                  await savePet({ id: editing.id, customerId, name: editing.name.trim(), species: editing.species, breed: editing.breed || undefined, sex: editing.sex, birthDate: editing.birthDate || undefined, weightKg: editing.weightKg ? Number(editing.weightKg) : undefined, notes: editing.notes || undefined, photo: editing.photo || undefined });
                  setEditing(null);
                  toast.success("Mascota guardada");
                } finally {
                  setSaving(false);
                }
              }}
            >
              Guardar
            </Button>
          </div>
        }
      >
        {editing && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 sm:col-span-2">
              {editing.photo ? <img src={editing.photo} alt="" className="size-16 rounded-2xl object-cover" /> : <span className="grid size-16 place-items-center rounded-2xl bg-vet-tint text-3xl">{SPECIES_META[editing.species].emoji}</span>}
              <label className="inline-flex h-11 cursor-pointer items-center rounded-2xl bg-vet-tint px-4 text-sm font-semibold text-vet-primary-dark">
                Subir foto
                <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setEditing({ ...editing, photo: await uploadImage(f, "pets", 400) }); } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); } }} />
              </label>
            </div>
            <Input label="Nombre" required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Select label="Especie" value={editing.species} onChange={(e) => setEditing({ ...editing, species: e.target.value as Species })}>
              {PET_SPECIES.map((s) => <option key={s} value={s}>{SPECIES_META[s].label}</option>)}
            </Select>
            <Input label="Raza" value={editing.breed} onChange={(e) => setEditing({ ...editing, breed: e.target.value })} />
            <Select label="Sexo" value={editing.sex} onChange={(e) => setEditing({ ...editing, sex: e.target.value as PetSex })}>
              <option value="macho">Macho</option><option value="hembra">Hembra</option><option value="desconocido">Prefiero no decir</option>
            </Select>
            <Input label="Fecha de nacimiento (opcional)" type="date" value={editing.birthDate} onChange={(e) => setEditing({ ...editing, birthDate: e.target.value })} hint="Para saludarlo en su cumpleaños 🎂" />
            <Input label="Peso (kg)" type="number" inputMode="decimal" step="0.1" min="0" value={editing.weightKg} onChange={(e) => setEditing({ ...editing, weightKg: e.target.value })} />
            <Textarea label="Observaciones" className="sm:col-span-2" value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Alergias, temperamento, cuidados…" />
          </div>
        )}
      </Sheet>
    </div>
  );
}

function Profile() {
  const { customer } = useCurrentCustomer();
  const [form, setForm] = useState(() => ({ name: customer?.name ?? "", phone: customer?.phone ?? "", email: customer?.email ?? "", street: customer?.address?.street ?? "", number: customer?.address?.number ?? "", optIn: customer?.marketingOptIn ?? false }));
  const [saving, setSaving] = useState(false);
  if (!customer) return null;
  return (
    <Card className="p-5">
      <form
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            await findOrCreateCustomer({ name: form.name, phone: form.phone, email: form.email || undefined, address: form.street ? { street: form.street, number: form.number || undefined } : undefined, marketingOptIn: form.optIn });
            toast.success("Datos actualizados");
          } finally {
            setSaving(false);
          }
        }}
      >
        <Input label="Nombre y apellido" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Teléfono" type="tel" value={form.phone} disabled hint="Para cambiarlo, escribinos por WhatsApp." />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="sm:col-span-2" />
        <Input label="Calle" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
        <Input label="Número" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
        <div className="sm:col-span-2"><Toggle checked={form.optIn} onChange={(v) => setForm({ ...form, optIn: v })} label="Recibir promociones y recordatorios" description="Podés cambiarlo cuando quieras." /></div>
        <Button type="submit" loading={saving} className="sm:col-span-2">Guardar cambios</Button>
      </form>
    </Card>
  );
}

