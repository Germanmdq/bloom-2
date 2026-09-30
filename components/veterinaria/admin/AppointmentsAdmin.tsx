"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Ban, CalendarPlus, Check, CheckCheck, ChevronLeft, ChevronRight, Hourglass, MessageCircle, Phone, UserX, X } from "lucide-react";
import { toast } from "sonner";
import type { Appointment, AppointmentStatus } from "@/lib/vet/types";
import { adminPath } from "@/lib/vet/config/integrations";
import { addDays, parseDateKey, toDateKey, WEEKDAY_SHORT } from "@/lib/vet/domain/dates";
import { formatDate, formatLongDay, formatMoney, uid } from "@/lib/vet/domain/format";
import { APPOINTMENT_STATUS } from "@/lib/vet/domain/labels";
import { getSlots } from "@/lib/vet/domain/availability";
import { fillTemplate, waLink } from "@/lib/vet/domain/whatsapp";
import { useCollection, useSettings, useVetData } from "@/lib/vet/client/store";
import { bookAppointment } from "@/lib/vet/client/actions";
import { Badge, Button, EmptyState, Input, Select, Sheet, Skeleton, Textarea } from "../ui/primitives";
import { Chips, PageHeader } from "./ui";
import { cn } from "@/lib/utils";

export function AppointmentsAdmin() {
  const params = useSearchParams();
  const router = useRouter();
  const appts = useCollection("appointments");
  const services = useCollection("services");
  const blocked = useCollection("blockedSlots");
  const waitlist = useCollection("waitlist");
  const settings = useSettings();
  const upsert = useVetData((s) => s.upsert);
  const remove = useVetData((s) => s.remove);
  const [tab, setTab] = useState<"agenda" | "pendientes" | "espera" | "bloqueos">("agenda");
  const [date, setDate] = useState(toDateKey(new Date()));
  const [blockOpen, setBlockOpen] = useState(false);
  const creating = params.get("nuevo") === "1";

  const svc = (id: string) => services.items.find((s) => s.id === id);
  const dayList = useMemo(() => appts.items.filter((a) => a.date === date).sort((a, b) => a.time.localeCompare(b.time)), [appts.items, date]);
  const today = toDateKey(new Date());
  const pending = appts.items.filter((a) => a.status === "pendiente" && a.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const waiting = waitlist.items.filter((w) => w.status === "esperando");
  const strip = Array.from({ length: 14 }, (_, i) => toDateKey(addDays(parseDateKey(date), i - 3)));
  const reminder = settings.automations.find((r) => r.id === "turno_proximo");

  const setStatus = async (a: Appointment, status: AppointmentStatus) => {
    await upsert("appointments", { ...a, status, updatedAt: new Date().toISOString() });
    toast.success(`${a.petName ?? a.customerName}: ${APPOINTMENT_STATUS[status].label}`);
  };

  const card = (a: Appointment, showDate = false) => {
    const s = svc(a.serviceId);
    const msg = fillTemplate(reminder?.template ?? "", { cliente: a.customerName.split(" ")[0], mascota: a.petName, servicio: s?.name, fecha: formatLongDay(a.date).toLowerCase(), hora: a.time, negocio: settings.business.name });
    return (
      <li key={a.id} className="rounded-3xl bg-white p-4 ring-1 ring-black/[0.06]">
        <div className="flex items-start gap-3">
          <div className="w-14 shrink-0 text-center">
            <p className="text-lg font-extrabold tabular-nums">{a.time}</p>
            {showDate && <p className="text-[11px] text-neutral-500">{formatDate(a.date, { weekday: "short", day: "numeric" })}</p>}
            <p className="text-[11px] text-neutral-500">{a.durationMin}′</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{a.petName ?? "Mascota"} <span className="font-normal text-neutral-500">· {a.customerName}</span></p>
            <p className="text-sm text-neutral-600">{s?.name}{a.price != null ? ` · ${formatMoney(a.price)}` : ""}</p>
            {a.notes && <p className="mt-1 rounded-xl bg-amber-50 px-2 py-1 text-xs text-amber-950">{a.notes}</p>}
            <div className="mt-1.5"><Badge tone={APPOINTMENT_STATUS[a.status].tone}>{APPOINTMENT_STATUS[a.status].label}</Badge></div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {a.status === "pendiente" ? (
            <Button size="sm" className="col-span-2" onClick={() => setStatus(a, "confirmado")}><Check className="size-4" /> Confirmar</Button>
          ) : a.status === "confirmado" ? (
            <Button size="sm" variant="secondary" className="col-span-2" onClick={() => setStatus(a, "completado")}><CheckCheck className="size-4" /> Completado</Button>
          ) : (
            <Button size="sm" variant="outline" className="col-span-2" onClick={() => setStatus(a, "confirmado")}>Reactivar</Button>
          )}
          <a href={waLink(a.phone, a.status === "pendiente" ? `Hola ${a.customerName.split(" ")[0]}, te confirmamos el turno de ${a.petName ?? "tu mascota"} para ${s?.name} el ${formatLongDay(a.date).toLowerCase()} a las ${a.time}. ¡Te esperamos en ${settings.business.name}!` : msg)} target="_blank" rel="noopener noreferrer" className="grid h-9 place-items-center rounded-xl bg-green-50 text-[#0e7a40]" aria-label="Escribir por WhatsApp"><MessageCircle className="size-4" /></a>
          <details className="relative">
            <summary className="grid h-9 cursor-pointer list-none place-items-center rounded-xl bg-neutral-100 text-sm font-bold" aria-label="Más acciones">⋯</summary>
            <div className="absolute right-0 z-10 mt-1 w-48 rounded-2xl bg-white p-1 shadow-xl ring-1 ring-black/10">
              <a href={`tel:${a.phone.replace(/[^\d+]/g, "")}`} className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm hover:bg-black/5"><Phone className="size-4" /> Llamar</a>
              <button type="button" onClick={() => setStatus(a, "ausente")} className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm hover:bg-black/5"><UserX className="size-4" /> No asistió</button>
              <button type="button" onClick={() => setStatus(a, "cancelado")} className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm text-red-700 hover:bg-red-50"><X className="size-4" /> Cancelar turno</button>
            </div>
          </details>
        </div>
      </li>
    );
  };

  return (
    <div>
      <PageHeader
        title="Turnos"
        subtitle="Confirmá, completá o reprogramá turnos. Los horarios libres se calculan solos."
        actions={
          <>
            <Button variant="outline" onClick={() => setBlockOpen(true)}><Ban className="size-4" /> Bloquear horario</Button>
            <Button onClick={() => router.replace(adminPath("/turnos?nuevo=1"))}><CalendarPlus className="size-4" /> Nuevo turno</Button>
          </>
        }
      />
      <Chips
        label="Vista"
        value={tab}
        onChange={setTab}
        options={[
          { value: "agenda", label: "Agenda" },
          { value: "pendientes", label: "Por confirmar", count: pending.length },
          { value: "espera", label: "Lista de espera", count: waiting.length },
          { value: "bloqueos", label: "Bloqueos", count: blocked.items.filter((b) => b.date >= today).length },
        ]}
      />

      {!appts.ready ? (
        <Skeleton className="mt-4 h-64" />
      ) : tab === "agenda" ? (
        <div className="mt-4">
          <div className="mb-3 flex items-center gap-2">
            <button type="button" onClick={() => setDate(toDateKey(addDays(parseDateKey(date), -7)))} className="grid size-10 shrink-0 place-items-center rounded-full bg-white ring-1 ring-black/10" aria-label="Semana anterior"><ChevronLeft className="size-4" /></button>
            <div className="vet-scroll-x flex flex-1 gap-1.5 overflow-x-auto">
              {strip.map((d) => {
                const dt = parseDateKey(d);
                const n = appts.items.filter((a) => a.date === d && a.status !== "cancelado").length;
                return (
                  <button key={d} type="button" onClick={() => setDate(d)} aria-pressed={date === d} className={cn("flex h-16 w-12 shrink-0 flex-col items-center justify-center rounded-2xl text-center ring-1", date === d ? "bg-vet-ink text-white ring-vet-ink" : d === today ? "bg-vet-tint ring-vet-primary/30" : "bg-white ring-black/[0.06]")}>
                    <span className="text-[10px] font-semibold uppercase">{WEEKDAY_SHORT[dt.getDay()]}</span>
                    <span className="text-lg font-extrabold leading-none">{dt.getDate()}</span>
                    <span className={cn("mt-0.5 text-[10px]", date === d ? "text-white/70" : "text-neutral-500")}>{n || "·"}</span>
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => setDate(toDateKey(addDays(parseDateKey(date), 7)))} className="grid size-10 shrink-0 place-items-center rounded-full bg-white ring-1 ring-black/10" aria-label="Semana siguiente"><ChevronRight className="size-4" /></button>
          </div>
          <p className="mb-2 text-sm font-semibold">{formatLongDay(date)}</p>
          {blocked.items.some((b) => b.date === date && !b.time) && <p className="mb-2 rounded-2xl bg-red-50 p-3 text-sm text-red-800">Día bloqueado para turnos online.</p>}
          {dayList.length ? <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">{dayList.map((a) => card(a))}</ul> : <EmptyState icon={<CalendarPlus className="size-6" />} title="Sin turnos este día" />}
        </div>
      ) : tab === "pendientes" ? (
        <div className="mt-4">{pending.length ? <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">{pending.map((a) => card(a, true))}</ul> : <EmptyState icon={<Check className="size-6" />} title="No hay turnos por confirmar" />}</div>
      ) : tab === "espera" ? (
        <div className="mt-4">
          {waiting.length ? (
            <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {waiting.map((w) => {
                const s = svc(w.serviceId);
                const next = s ? Array.from({ length: 14 }, (_, i) => toDateKey(addDays(new Date(), i))).flatMap((d) => getSlots(s, d, appts.items, blocked.items).filter((x) => x.available).map((x) => ({ d, t: x.time }))).find((x) => (!w.preferredDate || x.d >= w.preferredDate)) : undefined;
                return (
                  <li key={w.id} className="rounded-3xl bg-white p-4 ring-1 ring-black/[0.06]">
                    <p className="font-semibold">{w.name} {w.petName && <span className="font-normal text-neutral-500">· {w.petName}</span>}</p>
                    <p className="text-sm text-neutral-600">{s?.name} · prefiere {w.preferredDate ? formatDate(w.preferredDate) : "cualquier día"} {w.preferredTime ?? ""}</p>
                    {next && <p className="mt-1 text-xs text-vet-primary-dark">Primer horario libre: {formatLongDay(next.d)} {next.t}</p>}
                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      <a href={waLink(w.phone, next ? `Hola ${w.name.split(" ")[0]}, ¡se liberó un turno de ${s?.name} el ${formatLongDay(next.d).toLowerCase()} a las ${next.t}! ¿Lo querés?` : `Hola ${w.name.split(" ")[0]}, te escribimos por tu lugar en la lista de espera.`)} target="_blank" rel="noopener noreferrer" onClick={() => upsert("waitlist", { ...w, status: "avisado" })} className="col-span-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#128C4B] text-sm font-bold text-white"><MessageCircle className="size-4" /> Avisar</a>
                      <button type="button" onClick={() => upsert("waitlist", { ...w, status: "descartado" })} className="h-9 rounded-xl bg-neutral-100 text-sm font-semibold">Quitar</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={<Hourglass className="size-6" />} title="Nadie en lista de espera" />
          )}
        </div>
      ) : (
        <div className="mt-4">
          {blocked.items.filter((b) => b.date >= today).length ? (
            <ul className="space-y-2">
              {blocked.items.filter((b) => b.date >= today).sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? ""))).map((b) => (
                <li key={b.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/[0.06]">
                  <Ban className="size-4 text-red-600" />
                  <span className="flex-1 text-sm"><strong>{formatLongDay(b.date)}</strong> {b.time ? `· ${b.time}` : "· todo el día"} {b.serviceId ? `· ${svc(b.serviceId)?.name}` : "· todos los servicios"}{b.reason ? ` · ${b.reason}` : ""}</span>
                  <button type="button" onClick={() => remove("blockedSlots", b.id)} className="h-9 rounded-xl px-3 text-sm font-semibold text-vet-primary-dark hover:bg-vet-tint">Desbloquear</button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Ban className="size-6" />} title="No hay horarios bloqueados" text="Bloqueá feriados, vacaciones o un horario puntual para que no se pueda reservar online." />
          )}
        </div>
      )}

      <BlockSheet open={blockOpen} onClose={() => setBlockOpen(false)} defaultDate={date} />
      {creating && <NewAppointmentSheet onClose={() => router.replace(adminPath("/turnos"))} defaultDate={date} />}
    </div>
  );
}

function BlockSheet({ open, onClose, defaultDate }: { open: boolean; onClose: () => void; defaultDate: string }) {
  const services = useCollection("services");
  const upsert = useVetData((s) => s.upsert);
  const [b, setB] = useState({ date: defaultDate, time: "", serviceId: "", reason: "" });
  return (
    <Sheet open={open} onClose={onClose} title="Bloquear horario" footer={<Button size="lg" className="w-full" onClick={async () => { await upsert("blockedSlots", { id: uid("b_"), date: b.date, time: b.time || undefined, serviceId: b.serviceId || undefined, reason: b.reason || undefined }); toast.success("Horario bloqueado"); onClose(); }}>Bloquear</Button>}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Día" type="date" value={b.date} onChange={(e) => setB({ ...b, date: e.target.value })} />
        <Input label="Hora (vacío = todo el día)" type="time" value={b.time} onChange={(e) => setB({ ...b, time: e.target.value })} />
        <Select label="Servicio" value={b.serviceId} onChange={(e) => setB({ ...b, serviceId: e.target.value })}>
          <option value="">Todos los servicios</option>
          {services.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Input label="Motivo (interno)" value={b.reason} onChange={(e) => setB({ ...b, reason: e.target.value })} placeholder="Feriado, vacaciones…" />
      </div>
    </Sheet>
  );
}

function NewAppointmentSheet({ onClose, defaultDate }: { onClose: () => void; defaultDate: string }) {
  const services = useCollection("services");
  const appts = useCollection("appointments");
  const blocked = useCollection("blockedSlots");
  const [f, setF] = useState({ serviceId: "", date: defaultDate, time: "", name: "", phone: "", petName: "", notes: "", confirmed: true });
  const [saving, setSaving] = useState(false);
  const s = services.items.find((x) => x.id === (f.serviceId || services.items[0]?.id));
  const slots = s ? getSlots(s, f.date, appts.items, blocked.items, new Date(), 0) : [];
  return (
    <Sheet
      open
      onClose={onClose}
      title="Nuevo turno"
      footer={
        <Button
          size="lg"
          className="w-full"
          loading={saving}
          onClick={async () => {
            if (!s || !f.time || f.name.trim().length < 2 || f.phone.replace(/\D/g, "").length < 8) return toast.error("Completá servicio, horario, nombre y teléfono");
            setSaving(true);
            try {
              await bookAppointment({ serviceId: s.id, date: f.date, time: f.time, customer: { name: f.name, phone: f.phone }, petName: f.petName || undefined, notes: f.notes, source: "admin", status: f.confirmed ? "confirmado" : "pendiente" });
              toast.success("Turno cargado");
              onClose();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error");
            } finally {
              setSaving(false);
            }
          }}
        >
          Guardar turno
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select label="Servicio" value={s?.id ?? ""} onChange={(e) => setF({ ...f, serviceId: e.target.value, time: "" })}>
          {services.items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </Select>
        <Input label="Día" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value, time: "" })} />
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-[13px] font-semibold text-vet-ink/80">Horario</p>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {slots.map((x) => (
              <button key={x.time} type="button" onClick={() => setF({ ...f, time: x.time })} aria-pressed={f.time === x.time} className={cn("h-10 rounded-xl text-sm font-semibold ring-1", f.time === x.time ? "bg-vet-ink text-white ring-vet-ink" : x.available ? "bg-white ring-black/10" : "bg-neutral-50 text-neutral-400 ring-black/5")} title={x.available ? "Libre" : "Ocupado/bloqueado (se puede sobreturnar)"}>
                {x.time}
              </button>
            ))}
            {!slots.length && <p className="col-span-4 text-sm text-neutral-500">El servicio no atiende ese día.</p>}
          </div>
        </div>
        <Input label="Teléfono" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <Input label="Nombre del cliente" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input label="Mascota" value={f.petName} onChange={(e) => setF({ ...f, petName: e.target.value })} />
        <Select label="Estado" value={f.confirmed ? "c" : "p"} onChange={(e) => setF({ ...f, confirmed: e.target.value === "c" })}>
          <option value="c">Confirmado</option>
          <option value="p">Pendiente</option>
        </Select>
        <Textarea label="Notas" className="sm:col-span-2" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </div>
    </Sheet>
  );
}
