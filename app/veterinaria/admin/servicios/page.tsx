"use client";
import { Suspense } from "react";
import { Plus, Stethoscope, Trash2 } from "lucide-react";
import type { Service, Weekday } from "@/lib/vet/types";
import { formatMoney, slugify, uid } from "@/lib/vet/domain/format";
import { WEEKDAY_SHORT } from "@/lib/vet/domain/dates";
import { CrudSection } from "@/components/veterinaria/admin/CrudSection";
import { PageHeader } from "@/components/veterinaria/admin/ui";
import { RequirePermission } from "@/components/veterinaria/admin/AdminShell";
import { ICON_NAMES, NamedIcon } from "@/components/veterinaria/ui/icons";
import { Badge, Button, Input } from "@/components/veterinaria/ui/primitives";

const DAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export default function ServiciosAdminPage() {
  return (
    <RequirePermission perm="services.manage">
      <PageHeader title="Servicios" subtitle="Duración, precio, días y horarios de cada servicio. Los bloqueos de agenda se hacen desde Turnos." />
      <Suspense>
        <CrudSection<"services">
          collection="services"
          newLabel="Nuevo servicio"
          emptyIcon={<Stethoscope className="size-6" />}
          sort={(a, b) => a.order - b.order}
          blank={(): Service => ({ id: uid("svc_"), slug: "", kind: "otro", name: "", icon: "Stethoscope", durationMin: 30, price: null, days: [1, 2, 3, 4, 5, 6], hours: [{ from: "09:00", to: "13:00" }], capacity: 1, species: ["perro", "gato"], visible: true, order: 99 })}
          validate={(s) => (s.name.trim().length < 2 ? "Ingresá un nombre" : s.durationMin < 5 ? "Duración inválida" : !s.hours.length ? "Agregá al menos una franja horaria" : null)}
          beforeSave={(s) => ({ ...s, slug: s.slug || slugify(s.name) })}
          fields={[
            { key: "name", label: "Nombre", type: "text", required: true },
            { key: "kind", label: "Tipo", type: "select", options: [
              { value: "veterinaria", label: "Veterinaria" }, { value: "bano", label: "Baño" }, { value: "peluqueria", label: "Peluquería" },
              { value: "unas", label: "Corte de uñas" }, { value: "deslanado", label: "Deslanado" }, { value: "higiene", label: "Higiene" }, { value: "otro", label: "Otro" },
            ] },
            { key: "description", label: "Descripción", type: "textarea" },
            { key: "durationMin", label: "Duración (minutos)", type: "number", min: 5 },
            { key: "price", label: "Precio", type: "money", nullable: true, hint: "Vacío = «Consultar»" },
            { key: "priceNote", label: "Aclaración de precio", type: "text", hint: "Ej: según tamaño" },
            { key: "capacity", label: "Turnos simultáneos", type: "number", min: 1, hint: "Ej: 2 si hay dos peluqueros" },
            { key: "repeatEveryDays", label: "Recordar repetir cada (días)", type: "number", hint: "Para los recordatorios automáticos" },
            { key: "icon", label: "Ícono", type: "select", options: ICON_NAMES.map((n) => ({ value: n, label: n })) },
            { key: "order", label: "Orden", type: "number" },
            { key: "visible", label: "Visible y reservable online", type: "toggle" },
          ]}
          extra={(s, set) => (
            <div className="space-y-4">
              <fieldset>
                <legend className="mb-1.5 text-[13px] font-semibold text-vet-ink/80">Días disponibles</legend>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d) => {
                    const on = s.days.includes(d);
                    return (
                      <button key={d} type="button" aria-pressed={on} onClick={() => set({ ...s, days: on ? s.days.filter((x) => x !== d) : [...s.days, d] })} className={`h-10 w-12 rounded-xl text-sm font-semibold ring-1 ${on ? "bg-vet-primary text-white ring-vet-primary" : "bg-white ring-black/10"}`}>
                        {WEEKDAY_SHORT[d]}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-1.5 text-[13px] font-semibold text-vet-ink/80">Horarios disponibles</legend>
                <div className="space-y-2">
                  {s.hours.map((h, i) => (
                    <div key={i} className="flex items-end gap-2">
                      <Input className="min-w-0 flex-1" label="Desde" type="time" value={h.from} onChange={(e) => set({ ...s, hours: s.hours.map((x, k) => (k === i ? { ...x, from: e.target.value } : x)) })} />
                      <Input className="min-w-0 flex-1" label="Hasta" type="time" value={h.to} onChange={(e) => set({ ...s, hours: s.hours.map((x, k) => (k === i ? { ...x, to: e.target.value } : x)) })} />
                      <button type="button" onClick={() => set({ ...s, hours: s.hours.filter((_, k) => k !== i) })} className="grid size-12 shrink-0 place-items-center rounded-2xl text-red-600 hover:bg-red-50" aria-label="Quitar franja"><Trash2 className="size-4" /></button>
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" onClick={() => set({ ...s, hours: [...s.hours, { from: "16:00", to: "20:00" }] })}><Plus className="size-4" /> Agregar franja</Button>
                </div>
              </fieldset>
            </div>
          )}
          row={(s) => ({
            title: <span className="flex items-center gap-2"><NamedIcon name={s.icon} className="size-5 text-vet-primary" /> {s.name}</span>,
            subtitle: `${s.durationMin} min · ${s.price != null ? formatMoney(s.price) : "Consultar"} · ${s.days.map((d) => WEEKDAY_SHORT[d]).join(" ")} · ${s.hours.map((h) => `${h.from}-${h.to}`).join(", ")}`,
            badges: <>{!s.visible && <Badge tone="gray">Oculto</Badge>}{s.capacity > 1 && <Badge tone="teal">{s.capacity} en simultáneo</Badge>}</>,
          })}
        />
      </Suspense>
    </RequirePermission>
  );
}
