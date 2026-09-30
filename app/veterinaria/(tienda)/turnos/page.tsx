import type { Metadata } from "next";
import { Suspense } from "react";
import { getPublicCatalog } from "@/lib/vet/server/catalog";
import { vetPath } from "@/lib/vet/config/integrations";
import { BookingFlow } from "@/components/veterinaria/store/BookingFlow";

export const metadata: Metadata = {
  title: "Reservar turno",
  description: "Reservá online tu turno de veterinaria, baño o peluquería canina. Elegí servicio, día y horario.",
  alternates: { canonical: vetPath("/turnos") },
};

export default async function TurnosPage() {
  const { services, combos } = await getPublicCatalog();
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
      <h1 className="font-vet-display text-3xl font-extrabold tracking-[-0.01em]">Reservar turno</h1>
      <p className="mt-1 text-sm text-neutral-600">Elegí el servicio, el día y el horario. Te confirmamos por WhatsApp.</p>
      <Suspense>
        <BookingFlow services={services.filter((s) => s.visible).sort((a, b) => a.order - b.order)} combos={combos.filter((c) => c.active)} />
      </Suspense>
    </div>
  );
}
