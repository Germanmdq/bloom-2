/**
 * Disponibilidad de turnos: genera franjas según duración, días y horarios
 * del servicio, y descuenta turnos tomados y horarios bloqueados.
 */
import type { Appointment, BlockedSlot, Service } from "../types";
import { minutesToTime, parseDateKey, timeToMinutes, toDateKey } from "./dates";

export interface Slot {
  time: string;
  available: boolean;
  remaining: number;
  reason?: "ocupado" | "bloqueado" | "pasado";
}

const ACTIVE: Appointment["status"][] = ["pendiente", "confirmado"];

/** Paso de la grilla: la duración del servicio, con mínimo de 15 y máximo de 60 min. */
export function slotStep(service: Service): number {
  return Math.min(60, Math.max(15, service.durationMin));
}

export function isServiceDay(service: Service, dateKey: string): boolean {
  return service.days.includes(parseDateKey(dateKey).getDay() as Service["days"][number]);
}

export function getSlots(
  service: Service,
  dateKey: string,
  appointments: Appointment[],
  blocked: BlockedSlot[],
  now = new Date(),
  /** Anticipación mínima para reservar, en minutos. */
  leadMinutes = 60,
): Slot[] {
  if (!isServiceDay(service, dateKey)) return [];
  const dayBlocked = blocked.filter((b) => b.date === dateKey && (!b.serviceId || b.serviceId === service.id));
  if (dayBlocked.some((b) => !b.time)) return [];

  const step = slotStep(service);
  const todayKey = toDateKey(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const sameDay = appointments.filter((a) => a.date === dateKey && ACTIVE.includes(a.status));
  const slots: Slot[] = [];

  for (const range of service.hours) {
    const start = timeToMinutes(range.from);
    const end = timeToMinutes(range.to);
    for (let t = start; t + service.durationMin <= end; t += step) {
      const time = minutesToTime(t);
      if (dateKey < todayKey || (dateKey === todayKey && t < nowMin + leadMinutes)) {
        slots.push({ time, available: false, remaining: 0, reason: "pasado" });
        continue;
      }
      const isBlocked = dayBlocked.some((b) => {
        if (!b.time) return false;
        const bt = timeToMinutes(b.time);
        return bt >= t && bt < t + service.durationMin;
      });
      if (isBlocked) {
        slots.push({ time, available: false, remaining: 0, reason: "bloqueado" });
        continue;
      }
      // Turnos del MISMO servicio que se superponen con esta franja.
      const overlapping = sameDay.filter((a) => {
        if (a.serviceId !== service.id) return false;
        const as = timeToMinutes(a.time);
        return as < t + service.durationMin && t < as + a.durationMin;
      }).length;
      const remaining = Math.max(0, service.capacity - overlapping);
      slots.push({ time, available: remaining > 0, remaining, reason: remaining > 0 ? undefined : "ocupado" });
    }
  }
  return slots;
}

/** Próximos días con al menos un horario libre. */
export function nextAvailableDays(
  service: Service,
  appointments: Appointment[],
  blocked: BlockedSlot[],
  now = new Date(),
  horizonDays = 21,
): { date: string; free: number }[] {
  const out: { date: string; free: number }[] = [];
  for (let i = 0; i < horizonDays; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const key = toDateKey(d);
    const free = getSlots(service, key, appointments, blocked, now).filter((s) => s.available).length;
    if (free > 0) out.push({ date: key, free });
  }
  return out;
}
