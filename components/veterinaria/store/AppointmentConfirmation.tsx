"use client";
import { CalendarCheck, CalendarPlus, MessageCircle } from "lucide-react";
import { vetPath } from "@/lib/vet/config/integrations";
import { formatLongDay } from "@/lib/vet/domain/format";
import { APPOINTMENT_STATUS } from "@/lib/vet/domain/labels";
import { waLink } from "@/lib/vet/domain/whatsapp";
import { useCollection, useSettings } from "@/lib/vet/client/store";
import { Badge, ButtonLink, Card, Skeleton } from "../ui/primitives";

/** Archivo .ics para agregar el turno al calendario del teléfono. */
function icsHref(title: string, date: string, time: string, minutes: number, location: string) {
  const [y, m, d] = date.split("-");
  const [hh, mm] = time.split(":");
  const start = `${y}${m}${d}T${hh}${mm}00`;
  const endDate = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm) + minutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  const end = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${title}`, `LOCATION:${location}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export function AppointmentConfirmation({ id }: { id: string }) {
  const settings = useSettings();
  const appts = useCollection("appointments");
  const services = useCollection("services");
  const a = appts.items.find((x) => x.id === id);
  if (!appts.ready) return <div className="mx-auto max-w-2xl px-4 pt-6"><Skeleton className="h-64" /></div>;

  if (!a) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-6">
        <Card className="p-6 text-center">
          <CalendarCheck className="mx-auto size-10 text-vet-primary" />
          <h1 className="mt-3 font-vet-display text-2xl font-extrabold">Solicitud de turno recibida</h1>
          <p className="mt-2 text-sm text-neutral-600">Te vamos a confirmar el turno por WhatsApp.</p>
        </Card>
      </div>
    );
  }

  const s = services.items.find((x) => x.id === a.serviceId);
  const b = settings.business;
  const msg = `Hola, reservé un turno de ${s?.name ?? "servicio"} para ${a.petName ?? "mi mascota"} el ${formatLongDay(a.date).toLowerCase()} a las ${a.time}. A nombre de ${a.customerName}.`;
  const location = b.address.street ? `${b.address.street}${b.address.city ? `, ${b.address.city}` : ""}` : b.name;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
      <div className="rounded-[28px] bg-gradient-to-br from-vet-primary to-vet-primary-dark p-6 text-white vet-rise">
        <CalendarCheck className="size-10" />
        <h1 className="mt-3 font-vet-display text-2xl font-extrabold">¡Turno solicitado!</h1>
        <p className="mt-1 text-white/85">
          {s?.name} para <strong>{a.petName}</strong>
        </p>
        <p className="mt-3 text-xl font-bold">{formatLongDay(a.date)} · {a.time} hs</p>
      </div>
      <Card className="mt-4 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-600">Estado</span>
          <Badge tone={APPOINTMENT_STATUS[a.status].tone}>{APPOINTMENT_STATUS[a.status].label}</Badge>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-neutral-700">
          {a.status === "pendiente" ? "Te confirmamos el turno por WhatsApp. Si querés, avisanos ahora y lo confirmamos más rápido." : "Tu turno está confirmado. ¡Te esperamos!"}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ButtonLink href={waLink(b.whatsapp, msg)} external variant="whatsapp">
            <MessageCircle className="size-4" /> Avisar por WhatsApp
          </ButtonLink>
          <a href={icsHref(`${s?.name ?? "Turno"} — ${b.name}`, a.date, a.time, a.durationMin, location)} download="turno-vida-de-perros.ics" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white text-sm font-semibold">
            <CalendarPlus className="size-4" /> Agregar al calendario
          </a>
        </div>
      </Card>
      <div className="mt-5 flex flex-wrap gap-2">
        <ButtonLink href={vetPath("/cuenta?tab=turnos")} variant="outline">Mis turnos</ButtonLink>
        <ButtonLink href={vetPath("/tienda")} variant="ghost">Ir a la tienda</ButtonLink>
      </div>
    </div>
  );
}
