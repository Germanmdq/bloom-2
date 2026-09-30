"use client";
import { Clock } from "lucide-react";
import { useSettings } from "@/lib/vet/client/store";
import { WEEKDAY_NAMES } from "@/lib/vet/domain/dates";
import { Badge } from "../ui/primitives";

export function HoursList({ compact }: { compact?: boolean }) {
  const { business } = useSettings();
  const today = new Date().getDay();
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-semibold text-vet-ink">
        <Clock className="size-4 text-vet-primary" /> Horarios
        {!business.hoursConfirmed && <Badge tone="amber">A confirmar</Badge>}
      </div>
      <ul className={compact ? "mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]" : "mt-3 space-y-1.5 text-sm"}>
        {order.map((d) => {
          const h = business.hours.find((x) => x.day === d);
          return (
            <li key={d} className={`flex justify-between gap-3 ${d === today ? "font-semibold text-vet-ink" : "text-neutral-600"}`}>
              <span>{compact ? WEEKDAY_NAMES[d].slice(0, 3) : WEEKDAY_NAMES[d]}</span>
              <span className="tabular-nums">{h?.ranges.length ? h.ranges.map((r) => `${r.from}–${r.to}`).join(" · ") : "Cerrado"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
