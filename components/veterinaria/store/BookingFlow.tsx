"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarX, Check, ChevronDown, Clock, Hourglass, PawPrint } from "lucide-react";
import { toast } from "sonner";
import type { Appointment, Combo, Service, Species } from "@/lib/vet/types";
import { INTEGRATIONS, vetPath } from "@/lib/vet/config/integrations";
import { getSlots, nextAvailableDays } from "@/lib/vet/domain/availability";
import { addDays, parseDateKey, toDateKey, WEEKDAY_SHORT } from "@/lib/vet/domain/dates";
import { formatLongDay, formatMoney } from "@/lib/vet/domain/format";
import { PET_SPECIES, SPECIES_META } from "@/lib/vet/domain/labels";
import { useCollection } from "@/lib/vet/client/store";
import { useCurrentCustomer } from "@/lib/vet/client/session";
import { bookAppointment, joinWaitlist, savePet } from "@/lib/vet/client/actions";
import { NamedIcon } from "../ui/icons";
import { Button, Card, Input, Select, Textarea, Toggle } from "../ui/primitives";
import { cn } from "@/lib/utils";

export function BookingFlow({ services, combos }: { services: Service[]; combos: Combo[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const { customer } = useCurrentCustomer();
  const pets = useCollection("pets");
  const localAppointments = useCollection("appointments", INTEGRATIONS.dataSource === "demo");
  const [remoteBusy, setRemoteBusy] = useState<Appointment[] | null>(null);
  const blocked = useCollection("blockedSlots");
  // En modo supabase, el visitante no puede leer turnos ajenos: se piden solo los horarios ocupados.
  useEffect(() => {
    if (INTEGRATIONS.dataSource !== "supabase") return;
    fetch("/api/veterinaria/availability").then((r) => r.json()).then((j) => setRemoteBusy(j.busy ?? [])).catch(() => setRemoteBusy([]));
  }, []);
  const appointments = INTEGRATIONS.dataSource === "demo" ? localAppointments : { items: remoteBusy ?? [], ready: remoteBusy != null };
  const [serviceId, setServiceId] = useState(params.get("servicio") ?? "");
  const comboId = params.get("combo") ?? undefined;
  const combo = combos.find((c) => c.id === comboId);
  const [petId, setPetId] = useState<string>("");
  const [pet, setPet] = useState({ name: "", species: "perro" as Species });
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", notes: "", optIn: true, savePet: true });
  const [sending, setSending] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const service = services.find((s) => s.id === serviceId);
  const myPets = customer ? pets.items.filter((p) => p.customerId === customer.id) : [];

  useEffect(() => {
    if (customer) setForm((f) => ({ ...f, name: f.name || customer.name, phone: f.phone || customer.phone, optIn: customer.marketingOptIn }));
  }, [customer?.id]);
  useEffect(() => {
    if (myPets.length && !petId) setPetId(myPets[0].id);
  }, [myPets.length]);

  const now = useMemo(() => new Date(), []);
  const days = useMemo(() => (service && appointments.ready ? nextAvailableDays(service, appointments.items, blocked.items, now, 21) : []), [service, appointments.items, blocked.items, appointments.ready]);
  const calendar = useMemo(() => Array.from({ length: 21 }, (_, i) => toDateKey(addDays(now, i))), [now]);
  const slots = useMemo(() => (service && date ? getSlots(service, date, appointments.items, blocked.items, new Date()) : []), [service, date, appointments.items, blocked.items]);

  useEffect(() => {
    if (!date && days.length) setDate(days[0].date);
  }, [days.length]);
  useEffect(() => setTime(""), [date, serviceId]);

  const selectedPet = myPets.find((p) => p.id === petId);
  const petName = selectedPet?.name ?? pet.name;

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!service) errs.service = "Elegí un servicio";
    if (!date || !time) errs.time = "Elegí día y horario";
    if (!petName.trim()) errs.pet = "Contanos el nombre de tu mascota";
    if (form.name.trim().length < 2) errs.name = "Ingresá tu nombre";
    if (form.phone.replace(/\D/g, "").length < 8) errs.phone = "Ingresá un teléfono válido";
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error(Object.values(errs)[0]);
      return;
    }
    setSending(true);
    try {
      const a = await bookAppointment({ serviceId: service!.id, comboId, date, time, customer: { name: form.name, phone: form.phone, marketingOptIn: form.optIn }, petId: selectedPet?.id, petName: petName.trim(), notes: form.notes });
      if (!selectedPet && form.savePet && a.customerId) {
        await savePet({ customerId: a.customerId, name: pet.name.trim(), species: pet.species, sex: "desconocido" });
      }
      router.push(vetPath(`/turnos/${a.id}`));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos reservar el turno");
    } finally {
      setSending(false);
    }
  };

  const step = (n: number, title: string, done: boolean) => (
    <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
      <span className={cn("grid size-7 place-items-center rounded-full text-xs text-white", done ? "bg-emerald-600" : "bg-vet-primary")}>{done ? <Check className="size-4" /> : n}</span>
      {title}
    </h2>
  );

  return (
    <div className="mt-6 space-y-4 pb-6">
      {combo && (
        <p className="rounded-2xl bg-vet-tint p-3 text-sm text-vet-primary-dark">
          Estás reservando el <strong>{combo.name}</strong>
          {combo.price != null ? ` · ${formatMoney(combo.price)}` : ""}.
        </p>
      )}

      <Card className="p-5">
        {step(1, "Servicio", Boolean(service))}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Servicio">
          {services.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={serviceId === s.id} onClick={() => setServiceId(s.id)} className={cn("flex min-h-24 flex-col items-start rounded-2xl p-3 text-left ring-1 transition", serviceId === s.id ? "bg-vet-tint ring-2 ring-vet-primary" : "bg-white ring-black/10 hover:ring-vet-primary/40")}>
              <NamedIcon name={s.icon} className="size-6 text-vet-primary" />
              <span className="mt-2 text-sm font-bold leading-tight">{s.name}</span>
              <span className="mt-0.5 text-xs text-neutral-500">{s.durationMin} min · {s.price != null ? formatMoney(s.price) : "Consultar"}</span>
            </button>
          ))}
        </div>
      </Card>

      {service && (
        <Card className="p-5">
          {step(2, "Mascota", Boolean(petName.trim()))}
          {myPets.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {myPets.map((p) => (
                <button key={p.id} type="button" onClick={() => setPetId(p.id)} aria-pressed={petId === p.id} className={cn("inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold ring-1", petId === p.id ? "bg-vet-ink text-white ring-vet-ink" : "bg-white ring-black/10")}>
                  <span aria-hidden="true">{SPECIES_META[p.species].emoji}</span> {p.name}
                </button>
              ))}
              <button type="button" onClick={() => setPetId("")} aria-pressed={!petId} className={cn("inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold ring-1", !petId ? "bg-vet-ink text-white ring-vet-ink" : "bg-white ring-black/10")}>
                <PawPrint className="size-4" /> Otra mascota
              </button>
            </div>
          )}
          {!selectedPet && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Nombre de tu mascota" required value={pet.name} onChange={(e) => setPet({ ...pet, name: e.target.value })} error={errors.pet} />
              <Select label="Especie" value={pet.species} onChange={(e) => setPet({ ...pet, species: e.target.value as Species })}>
                {PET_SPECIES.map((s) => (
                  <option key={s} value={s}>{SPECIES_META[s].label}</option>
                ))}
              </Select>
            </div>
          )}
        </Card>
      )}

      {service && (
        <Card className="p-5">
          {step(3, "Día y horario", Boolean(date && time))}
          <div className="vet-scroll-x -mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="radiogroup" aria-label="Día">
            {calendar.map((d) => {
              const info = days.find((x) => x.date === d);
              const dt = parseDateKey(d);
              return (
                <button key={d} type="button" role="radio" aria-checked={date === d} disabled={!info} onClick={() => setDate(d)} aria-label={`${formatLongDay(d)}${info ? `, ${info.free} horarios libres` : ", sin horarios"}`} className={cn("flex h-20 w-16 shrink-0 flex-col items-center justify-center rounded-2xl ring-1 transition disabled:opacity-35", date === d ? "bg-vet-primary text-white ring-vet-primary" : "bg-white ring-black/10")}>
                  <span className="text-[11px] font-semibold uppercase">{WEEKDAY_SHORT[dt.getDay()]}</span>
                  <span className="text-xl font-extrabold leading-tight">{dt.getDate()}</span>
                  <span className={cn("text-[10px]", date === d ? "text-white/80" : "text-neutral-500")}>{info ? `${info.free} libres` : "—"}</span>
                </button>
              );
            })}
          </div>

          {date && (
            <>
              <p className="mt-4 text-sm font-semibold">{formatLongDay(date)}</p>
              {slots.filter((s) => s.reason !== "pasado").length ? (
                <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6" role="radiogroup" aria-label="Horario">
                  {slots
                    .filter((s) => s.reason !== "pasado")
                    .map((s) => (
                      <button key={s.time} type="button" role="radio" aria-checked={time === s.time} disabled={!s.available} onClick={() => setTime(s.time)} className={cn("h-11 rounded-xl text-sm font-semibold tabular-nums ring-1 transition disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-300 disabled:line-through", time === s.time ? "bg-vet-ink text-white ring-vet-ink" : "bg-white ring-black/10 hover:ring-vet-primary/50")}>
                        {s.time}
                      </button>
                    ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-neutral-600">No hay horarios este día.</p>
              )}
            </>
          )}
          {appointments.ready && !days.length && (
            <p className="mt-3 flex items-center gap-2 text-sm text-neutral-700"><CalendarX className="size-4" /> No hay turnos libres en las próximas 3 semanas.</p>
          )}

          {!waitlistDone ? (
            <button type="button" onClick={() => setWaitlistOpen((v) => !v)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-vet-primary-dark" aria-expanded={waitlistOpen}>
              <Hourglass className="size-4" /> ¿No encontrás horario? Sumate a la lista de espera <ChevronDown className={cn("size-4 transition", waitlistOpen && "rotate-180")} />
            </button>
          ) : (
            <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">¡Listo! Te avisamos por WhatsApp si se libera un turno.</p>
          )}
          {waitlistOpen && !waitlistDone && (
            <WaitlistForm
              defaults={{ name: form.name, phone: form.phone, petName }}
              onSubmit={async (w) => {
                await joinWaitlist({ ...w, serviceId: service.id });
                setWaitlistDone(true);
                setWaitlistOpen(false);
              }}
            />
          )}
        </Card>
      )}

      {service && date && time && (
        <Card className="p-5">
          {step(4, "Tus datos", false)}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Nombre y apellido" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
            <Input label="Teléfono / WhatsApp" type="tel" inputMode="tel" autoComplete="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} />
          </div>
          <Textarea label="Comentarios (opcional)" className="mt-3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ej: es su primera vez, se pone nervioso con el secador…" maxLength={500} />
          <div className="mt-3 space-y-1">
            {!selectedPet && <Toggle checked={form.savePet} onChange={(v) => setForm({ ...form, savePet: v })} label="Guardar a mi mascota en mi perfil" />}
            <Toggle checked={form.optIn} onChange={(v) => setForm({ ...form, optIn: v })} label="Recibir recordatorios de turnos y promociones" />
          </div>
          <div className="mt-5 rounded-2xl bg-vet-surface p-4 text-sm">
            <p className="font-bold">{service.name} · {petName || "tu mascota"}</p>
            <p className="mt-0.5 flex items-center gap-1 text-neutral-600"><Clock className="size-3.5" /> {formatLongDay(date)} · {time} hs</p>
          </div>
          <Button size="lg" className="mt-4 w-full" loading={sending} onClick={submit}>
            Confirmar turno
          </Button>
          <p className="mt-2 text-center text-xs text-neutral-500">El turno queda pendiente hasta que lo confirmemos por WhatsApp.</p>
        </Card>
      )}
    </div>
  );
}

function WaitlistForm({ defaults, onSubmit }: { defaults: { name: string; phone: string; petName: string }; onSubmit: (w: { name: string; phone: string; petName?: string; preferredDate?: string; preferredTime?: string; notes?: string }) => Promise<void> }) {
  const [w, setW] = useState({ ...defaults, preferredDate: "", preferredTime: "", notes: "" });
  const [sending, setSending] = useState(false);
  return (
    <form
      className="mt-3 grid gap-3 rounded-2xl bg-vet-surface p-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (w.name.trim().length < 2 || w.phone.replace(/\D/g, "").length < 8) return toast.error("Completá nombre y teléfono");
        setSending(true);
        try {
          await onSubmit({ name: w.name.trim(), phone: w.phone.trim(), petName: w.petName || undefined, preferredDate: w.preferredDate || undefined, preferredTime: w.preferredTime || undefined, notes: w.notes || undefined });
        } finally {
          setSending(false);
        }
      }}
    >
      <Input label="Nombre" required value={w.name} onChange={(e) => setW({ ...w, name: e.target.value })} />
      <Input label="Teléfono" type="tel" required value={w.phone} onChange={(e) => setW({ ...w, phone: e.target.value })} />
      <Input label="Mascota" value={w.petName} onChange={(e) => setW({ ...w, petName: e.target.value })} />
      <Input label="Día preferido" type="date" value={w.preferredDate} onChange={(e) => setW({ ...w, preferredDate: e.target.value })} />
      <Input label="Horario preferido" type="time" value={w.preferredTime} onChange={(e) => setW({ ...w, preferredTime: e.target.value })} />
      <Input label="Comentario" value={w.notes} onChange={(e) => setW({ ...w, notes: e.target.value })} />
      <Button type="submit" variant="dark" loading={sending} className="sm:col-span-2">Anotarme en la lista de espera</Button>
    </form>
  );
}
