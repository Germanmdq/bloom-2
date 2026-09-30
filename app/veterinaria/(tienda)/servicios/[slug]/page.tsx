import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, ChevronLeft, Clock, MessageCircle } from "lucide-react";
import { getPublicCatalog, getServiceBySlug } from "@/lib/vet/server/catalog";
import { vetPath } from "@/lib/vet/config/integrations";
import { formatMoney } from "@/lib/vet/domain/format";
import { WEEKDAY_NAMES } from "@/lib/vet/domain/dates";
import { SPECIES_META } from "@/lib/vet/domain/labels";
import { waLink, WA_MESSAGES } from "@/lib/vet/domain/whatsapp";
import { breadcrumbJsonLd, serviceJsonLd } from "@/lib/vet/seo";
import { JsonLd } from "@/components/veterinaria/JsonLd";
import { NamedIcon } from "@/components/veterinaria/ui/icons";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = await getServiceBySlug((await params).slug);
  if (!s) return { title: "Servicio no encontrado" };
  return { title: s.name, description: s.description, alternates: { canonical: vetPath(`/servicios/${s.slug}`) } };
}

export default async function ServicioPage({ params }: { params: Promise<{ slug: string }> }) {
  const s = await getServiceBySlug((await params).slug);
  if (!s) notFound();
  const { settings } = await getPublicCatalog();
  return (
    <div className="mx-auto max-w-3xl px-4 pt-5 sm:px-6">
      <JsonLd data={[serviceJsonLd(s, settings.business), breadcrumbJsonLd([{ name: "Inicio", path: vetPath() }, { name: "Servicios", path: vetPath("/servicios") }, { name: s.name, path: vetPath(`/servicios/${s.slug}`) }])]} />
      <Link href={vetPath("/servicios")} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-neutral-600"><ChevronLeft className="size-4" /> Servicios</Link>
      <div className="rounded-[28px] bg-white p-6 ring-1 ring-black/[0.05]">
        <span className="grid size-16 place-items-center rounded-2xl bg-vet-tint text-vet-primary"><NamedIcon name={s.icon} className="size-8" /></span>
        <h1 className="mt-4 font-vet-display text-3xl font-extrabold tracking-[-0.01em]">{s.name}</h1>
        <p className="mt-2 leading-relaxed text-neutral-700">{s.description}</p>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-2xl bg-vet-surface p-3"><dt className="text-neutral-500">Duración</dt><dd className="mt-0.5 flex items-center gap-1 font-semibold"><Clock className="size-4" />{s.durationMin} min</dd></div>
          <div className="rounded-2xl bg-vet-surface p-3"><dt className="text-neutral-500">Precio</dt><dd className="mt-0.5 font-semibold">{s.price != null ? formatMoney(s.price) : "A consultar"}</dd></div>
          <div className="rounded-2xl bg-vet-surface p-3"><dt className="text-neutral-500">Días</dt><dd className="mt-0.5 font-semibold">{s.days.map((d) => WEEKDAY_NAMES[d].slice(0, 3)).join(", ")}</dd></div>
        </dl>
        {s.species.length > 0 && <p className="mt-4 text-sm text-neutral-600">Para: {s.species.map((x) => SPECIES_META[x].plural.toLowerCase()).join(", ")}.</p>}
        {s.priceNote && <p className="mt-1 text-sm text-neutral-600">{s.priceNote}.</p>}
        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link href={vetPath(`/turnos?servicio=${s.id}`)} className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-vet-primary text-[15px] font-bold text-white hover:bg-vet-primary-dark">
            <CalendarCheck className="size-5" /> Reservar turno
          </Link>
          <a href={waLink(settings.business.whatsapp, WA_MESSAGES.appointment(s.name))} target="_blank" rel="noopener noreferrer" className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#128C4B] text-[15px] font-bold text-white">
            <MessageCircle className="size-5" /> Consultar por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
