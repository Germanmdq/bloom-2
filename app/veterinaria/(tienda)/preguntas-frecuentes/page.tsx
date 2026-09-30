import type { Metadata } from "next";
import { ChevronDown, MessageCircle } from "lucide-react";
import { getPublicCatalog } from "@/lib/vet/server/catalog";
import { vetPath } from "@/lib/vet/config/integrations";
import { faqJsonLd } from "@/lib/vet/seo";
import { waLink, WA_MESSAGES } from "@/lib/vet/domain/whatsapp";
import { JsonLd } from "@/components/veterinaria/JsonLd";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Envíos, turnos, medios de pago, baños, peluquería, retiro en el local y más.",
  alternates: { canonical: vetPath("/preguntas-frecuentes") },
};

export default async function FaqPage() {
  const { faqs, settings } = await getPublicCatalog();
  const list = faqs.filter((f) => f.visible).sort((a, b) => a.order - b.order);
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
      <JsonLd data={faqJsonLd(list)} />
      <h1 className="font-vet-display text-3xl font-extrabold tracking-[-0.01em]">Preguntas frecuentes</h1>
      <div className="mt-5 divide-y divide-black/5 rounded-[28px] bg-white px-5 ring-1 ring-black/[0.06]">
        {list.map((f) => (
          <details key={f.id} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold">
              {f.question}
              <ChevronDown className="size-5 shrink-0 text-neutral-400 transition group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{f.answer}</p>
          </details>
        ))}
      </div>
      <div className="mt-6 rounded-[28px] bg-vet-tint p-5 text-center">
        <p className="font-semibold">¿No encontraste tu respuesta?</p>
        <a href={waLink(settings.business.whatsapp, WA_MESSAGES.help())} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex h-12 items-center gap-2 rounded-2xl bg-[#128C4B] px-5 font-bold text-white">
          <MessageCircle className="size-5" /> Escribinos por WhatsApp
        </a>
      </div>
    </div>
  );
}
