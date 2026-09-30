"use client";
import { CalendarCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Combo, Product, Service } from "@/lib/vet/types";
import { comboRegularPrice } from "@/lib/vet/domain/pricing";
import { formatMoney } from "@/lib/vet/domain/format";
import { useCart } from "@/lib/vet/client/cart";
import { vetPath } from "@/lib/vet/config/integrations";
import { Button, ButtonLink, Card, DemoTag } from "../ui/primitives";

export function ComboCard({ combo, products, services }: { combo: Combo; products: Product[]; services: Service[] }) {
  const add = useCart((s) => s.add);
  const regular = comboRegularPrice(combo, products, services);
  const saving = regular != null && combo.price != null ? regular - combo.price : null;
  const hasServices = combo.items.some((i) => i.serviceId);
  const names = combo.items.map((i) => (i.productId ? products.find((p) => p.id === i.productId)?.name : services.find((s) => s.id === i.serviceId)?.name)).filter(Boolean);
  const firstService = combo.items.find((i) => i.serviceId)?.serviceId;

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-vet-primary">Combo</p>
        {combo.demo && <DemoTag />}
      </div>
      <h3 className="mt-1 font-vet-display text-lg font-extrabold leading-tight">{combo.name}</h3>
      <ul className="mt-2 space-y-0.5 text-sm text-neutral-600">
        {names.map((n) => (
          <li key={n}>• {n}</li>
        ))}
      </ul>
      <dl className="mt-4 space-y-1 text-sm">
        {regular != null && (
          <div className="flex justify-between text-neutral-500">
            <dt>Precio individual</dt>
            <dd className="line-through tabular-nums">{formatMoney(regular)}</dd>
          </div>
        )}
        <div className="flex justify-between font-bold text-vet-ink">
          <dt>Precio combo</dt>
          <dd className="tabular-nums">{combo.price != null ? formatMoney(combo.price) : "Consultar"}</dd>
        </div>
        {saving != null && saving > 0 && (
          <div className="flex justify-between font-semibold text-emerald-700">
            <dt>Ahorrás</dt>
            <dd className="tabular-nums">{formatMoney(saving)}</dd>
          </div>
        )}
      </dl>
      <div className="mt-auto pt-4">
        {hasServices ? (
          <ButtonLink href={vetPath(`/turnos?servicio=${firstService}&combo=${combo.id}`)} variant="secondary" className="w-full">
            <CalendarCheck className="size-4" /> Reservar combo
          </ButtonLink>
        ) : (
          <Button
            className="w-full"
            disabled={combo.price == null}
            onClick={() => {
              add({ comboId: combo.id, quantity: 1 });
              toast.success("Combo agregado al carrito", { description: combo.name });
            }}
          >
            <Plus className="size-4" /> Agregar combo
          </Button>
        )}
      </div>
    </Card>
  );
}
