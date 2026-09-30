import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { getPublicCatalog } from "@/lib/vet/server/catalog";
import { vetPath } from "@/lib/vet/config/integrations";
import { formatMoney } from "@/lib/vet/domain/format";
import { serviceJsonLd, breadcrumbJsonLd } from "@/lib/vet/seo";
import { JsonLd } from "@/components/veterinaria/JsonLd";
import { NamedIcon } from "@/components/veterinaria/ui/icons";

export const metadata: Metadata = {
  title: "Servicios: veterinaria, baño y peluquería canina",
  description: "Consulta veterinaria, baño, peluquería canina, corte de uñas, deslanado e higiene. Reservá tu turno online.",
  alternates: { canonical: vetPath("/servicios") },
};

export default async function ServiciosPage() {
  const { services, settings } = await getPublicCatalog();
  const list = services.filter((s) => s.visible).sort((a, b) => a.order - b.order);
  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
      <JsonLd data={[breadcrumbJsonLd([{ name: "Inicio", path: vetPath() }, { name: "Servicios", path: vetPath("/servicios") }]), ...list.map((s) => serviceJsonLd(s, settings.business))]} />
      <h1 className="font-vet-display text-3xl font-extrabold tracking-[-0.01em]">Servicios</h1>
      <p className="mt-1 text-sm text-neutral-600">Cuidamos a tu mascota con profesionales y mucho cariño. Reservá online en menos de un minuto.</p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {list.map((s) => (
          <article key={s.id} className="group flex gap-4 rounded-3xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-md">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-vet-tint text-vet-primary">
              <NamedIcon name={s.icon} className="size-7" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-vet-display text-lg font-bold">
                <Link href={vetPath(`/servicios/${s.slug}`)} className="hover:text-vet-primary-dark">{s.name}</Link>
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-600">{s.description}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="inline-flex items-center gap-1 text-neutral-500"><Clock className="size-3.5" /> {s.durationMin} min</span>
                <span className="font-semibold">{s.price != null ? formatMoney(s.price) : "Precio a consultar"}</span>
                {s.priceNote && <span className="text-xs text-neutral-500">{s.priceNote}</span>}
              </p>
              <Link href={vetPath(`/turnos?servicio=${s.id}`)} className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-xl bg-vet-primary px-4 text-sm font-bold text-white hover:bg-vet-primary-dark">
                Reservar turno <ArrowRight className="size-4" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
