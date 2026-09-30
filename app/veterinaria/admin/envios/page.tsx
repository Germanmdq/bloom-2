"use client";
import { Suspense } from "react";
import { Truck } from "lucide-react";
import { toast } from "sonner";
import type { ShippingZone } from "@/lib/vet/types";
import { formatMoney, uid } from "@/lib/vet/domain/format";
import { useSettings, useVetData } from "@/lib/vet/client/store";
import { CrudSection } from "@/components/veterinaria/admin/CrudSection";
import { PageHeader, Panel } from "@/components/veterinaria/admin/ui";
import { RequirePermission } from "@/components/veterinaria/admin/AdminShell";
import { Badge, Input, Toggle } from "@/components/veterinaria/ui/primitives";

export default function EnviosPage() {
  const settings = useSettings();
  const save = useVetData((s) => s.saveSettings);
  const sh = settings.shipping;
  const update = (patch: Partial<typeof sh>) => save({ ...settings, shipping: { ...sh, ...patch } }).then(() => toast.success("Guardado"));

  return (
    <RequirePermission perm="settings.manage">
      <PageHeader title="Envíos" subtitle="Zonas, precios y envío gratis." />
      <Panel title="Opciones generales" className="mb-5">
        <Toggle checked={sh.pickupEnabled} onChange={(v) => update({ pickupEnabled: v })} label="Retiro en el local" />
        <Toggle checked={sh.deliveryEnabled} onChange={(v) => update({ deliveryEnabled: v })} label="Envío a domicilio" />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Envío gratis desde ($)" type="number" inputMode="numeric" defaultValue={sh.freeShippingFrom ?? ""} hint="Vacío = sin envío gratis general" onBlur={(e) => update({ freeShippingFrom: e.target.value === "" ? null : Number(e.target.value) })} />
          <Input label="Texto de tiempo de entrega" defaultValue={sh.estimatedDelivery} onBlur={(e) => update({ estimatedDelivery: e.target.value })} />
        </div>
      </Panel>
      <Suspense>
        <CrudSection<"shippingZones">
          collection="shippingZones"
          title="Zonas de envío"
          newLabel="Nueva zona"
          emptyIcon={<Truck className="size-6" />}
          sort={(a, b) => a.order - b.order}
          blank={(): ShippingZone => ({ id: uid("z_"), name: "", price: null, active: true, order: 9 })}
          validate={(z) => (!z.name.trim() ? "Poné un nombre" : null)}
          fields={[
            { key: "name", label: "Nombre", type: "text", required: true, placeholder: "Ej: Zona 1" },
            { key: "description", label: "Barrios / descripción", type: "text" },
            { key: "price", label: "Precio de envío ($)", type: "money", nullable: true, hint: "Vacío = a coordinar" },
            { key: "freeFrom", label: "Envío gratis en esta zona desde ($)", type: "money", nullable: true },
            { key: "maxKm", label: "Radio de cobertura (km)", type: "number", nullable: true, step: 0.5, hint: "Permite detectar la zona por ubicación del cliente (requiere coordenadas del local)" },
            { key: "order", label: "Orden", type: "number" },
            { key: "active", label: "Activa", type: "toggle" },
          ]}
          row={(z) => ({
            title: z.name,
            subtitle: [z.description, z.price != null ? formatMoney(z.price) : "A coordinar", z.freeFrom ? `gratis desde ${formatMoney(z.freeFrom)}` : null, z.maxKm ? `hasta ${z.maxKm} km` : null].filter(Boolean).join(" · "),
            badges: <Badge tone={z.active ? "green" : "gray"}>{z.active ? "Activa" : "Inactiva"}</Badge>,
          })}
        />
      </Suspense>
    </RequirePermission>
  );
}
