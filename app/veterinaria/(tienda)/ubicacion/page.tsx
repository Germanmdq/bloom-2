import type { Metadata } from "next";
import { Instagram, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { getPublicCatalog } from "@/lib/vet/server/catalog";
import { INTEGRATIONS, vetPath } from "@/lib/vet/config/integrations";
import { localBusinessJsonLd } from "@/lib/vet/seo";
import { waLink, WA_MESSAGES } from "@/lib/vet/domain/whatsapp";
import { JsonLd } from "@/components/veterinaria/JsonLd";
import { HoursList } from "@/components/veterinaria/store/HoursList";

export const metadata: Metadata = {
  title: "Ubicación y horarios",
  description: "Cómo llegar a Vida de Perros: dirección, mapa, horarios, teléfono y WhatsApp.",
  alternates: { canonical: vetPath("/ubicacion") },
};

export default async function UbicacionPage() {
  const { settings, reviews } = await getPublicCatalog();
  const b = settings.business;
  const addressText = b.address.street ? [b.address.street, b.address.city, b.address.province].filter(Boolean).join(", ") : null;
  const query = b.geo ? `${b.geo.lat},${b.geo.lng}` : addressText;
  // "Cómo llegar": Google Maps (en iPhone el enlace de maps.apple también funciona; Google Maps abre la app si está instalada).
  const directions = b.googleMapsUrl ?? (query ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}` : null);
  const appleMaps = query ? `https://maps.apple.com/?daddr=${encodeURIComponent(query)}` : null;
  const embed = query
    ? INTEGRATIONS.googleMapsEmbedKey
      ? `https://www.google.com/maps/embed/v1/place?key=${INTEGRATIONS.googleMapsEmbedKey}&q=${encodeURIComponent(query)}`
      : `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
      <JsonLd data={localBusinessJsonLd(b, reviews)} />
      <h1 className="font-vet-display text-3xl font-extrabold tracking-[-0.01em]">Ubicación y horarios</h1>
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="overflow-hidden rounded-[28px] bg-white ring-1 ring-black/[0.06]">
          {embed ? (
            <iframe title={`Mapa de ${b.name}`} src={embed} className="aspect-[4/3] w-full border-0 lg:aspect-auto lg:h-full lg:min-h-[420px]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          ) : (
            <div className="grid aspect-[4/3] place-items-center bg-gradient-to-br from-vet-tint to-vet-sand p-8 text-center lg:h-full">
              <div>
                <MapPin className="mx-auto size-10 text-vet-primary" />
                <p className="mt-3 font-semibold">El mapa aparece cuando se cargue la dirección</p>
                <p className="mt-1 text-sm text-neutral-600">Mientras tanto, escribinos y te pasamos cómo llegar.</p>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="rounded-[28px] bg-white p-5 ring-1 ring-black/[0.06]">
            <h2 className="font-vet-display text-xl font-bold">{b.name}</h2>
            <p className="mt-2 flex items-start gap-2 text-sm text-neutral-700">
              <MapPin className="mt-0.5 size-4 shrink-0 text-vet-primary" /> {addressText ?? "Dirección a confirmar"}
            </p>
            <div className="mt-4 grid gap-2">
              {directions ? (
                <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-vet-primary font-bold text-white">
                  <Navigation className="size-5" /> Cómo llegar
                </a>
              ) : (
                <span className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-neutral-100 text-sm font-semibold text-neutral-500" aria-disabled="true">
                  <Navigation className="size-5" /> Cómo llegar (dirección pendiente)
                </span>
              )}
              {appleMaps && <a href={appleMaps} target="_blank" rel="noopener noreferrer" className="text-center text-sm font-semibold text-vet-primary-dark">Abrir en Apple Maps</a>}
              {b.whatsapp && (
                <a href={waLink(b.whatsapp, WA_MESSAGES.help())} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#128C4B] font-bold text-white">
                  <MessageCircle className="size-5" /> WhatsApp
                </a>
              )}
              {b.phone && (
                <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white font-bold ring-1 ring-black/10">
                  <Phone className="size-5" /> Llamar {b.phone}
                </a>
              )}
              {b.instagram && (
                <a href={`https://instagram.com/${b.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white font-bold ring-1 ring-black/10">
                  <Instagram className="size-5 text-vet-accent" /> @{b.instagram}
                </a>
              )}
            </div>
          </div>
          <div className="rounded-[28px] bg-white p-5 ring-1 ring-black/[0.06]">
            <HoursList />
          </div>
        </div>
      </div>
    </div>
  );
}
