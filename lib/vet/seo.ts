/**
 * Datos estructurados Schema.org (JSON-LD) para SEO local:
 * VeterinaryCare + PetStore (LocalBusiness), Product/Offer, BreadcrumbList,
 * Service y FAQPage. Solo se publican los datos que existen en la
 * configuración: nunca se inventan dirección, horarios ni coordenadas.
 */
import type { BusinessSettings, Category, Faq, Product, Review, Service } from "./types";
import { INTEGRATIONS, vetPath } from "./config/integrations";
import { displayPrice } from "./domain/pricing";
import { getStockStatus } from "./domain/stock";

const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const absoluteUrl = (path: string) => `${INTEGRATIONS.siteUrl}${path}`;

export function localBusinessJsonLd(b: BusinessSettings, reviews: Review[] = []) {
  const realReviews = reviews.filter((r) => !r.demo && r.visible);
  const sameAs = [b.instagram && `https://instagram.com/${b.instagram}`, b.facebook, b.tiktok, INTEGRATIONS.googleBusinessProfileUrl].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": ["VeterinaryCare", "PetStore"],
    "@id": absoluteUrl(`${vetPath()}#negocio`),
    name: b.name,
    description: b.description,
    slogan: b.tagline,
    url: absoluteUrl(vetPath()),
    logo: absoluteUrl("/veterinaria/icons/icon-512.png"),
    image: absoluteUrl("/veterinaria/icons/icon-512.png"),
    telephone: b.phone ?? undefined,
    email: b.email ?? undefined,
    priceRange: "$$",
    currenciesAccepted: "ARS",
    ...(b.address.street
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: b.address.street,
            addressLocality: b.address.city ?? undefined,
            addressRegion: b.address.province ?? undefined,
            postalCode: b.address.postalCode ?? undefined,
            addressCountry: b.address.country,
          },
        }
      : {}),
    ...(b.geo ? { geo: { "@type": "GeoCoordinates", latitude: b.geo.lat, longitude: b.geo.lng } } : {}),
    ...(b.hoursConfirmed
      ? {
          openingHoursSpecification: b.hours.flatMap((h) =>
            h.ranges.map((r) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: `https://schema.org/${DAY[h.day]}`, opens: r.from, closes: r.to })),
          ),
        }
      : {}),
    ...(b.areaServed.length ? { areaServed: b.areaServed } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(realReviews.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: (realReviews.reduce((s, r) => s + r.rating, 0) / realReviews.length).toFixed(1),
            reviewCount: realReviews.length,
          },
        }
      : {}),
  };
}

export function productJsonLd(p: Product, category?: Category) {
  const { price } = displayPrice(p);
  const status = getStockStatus(p);
  const url = absoluteUrl(vetPath(`/producto/${p.slug}`));
  const prices = p.variants.map((v) => v.price).filter((x): x is number => x != null);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description ?? `${p.name}${category ? ` — ${category.name}` : ""}`,
    sku: p.sku ?? p.code,
    gtin13: p.barcode && /^\d{13}$/.test(p.barcode) ? p.barcode : undefined,
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    category: category?.name,
    image: p.images.length ? p.images.map((i) => (i.startsWith("http") ? i : absoluteUrl(i))) : undefined,
    url,
    ...(price != null && !p.requiresConsultation
      ? {
          offers:
            prices.length > 1
              ? { "@type": "AggregateOffer", priceCurrency: "ARS", lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length, url }
              : {
                  "@type": "Offer",
                  priceCurrency: "ARS",
                  price,
                  url,
                  availability: status === "sin_stock" ? "https://schema.org/OutOfStock" : status === "poco" ? "https://schema.org/LimitedAvailability" : "https://schema.org/InStock",
                  itemCondition: "https://schema.org/NewCondition",
                },
        }
      : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

export function serviceJsonLd(s: Service, b: BusinessSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.name,
    description: s.description,
    serviceType: s.name,
    provider: { "@id": absoluteUrl(`${vetPath()}#negocio`), name: b.name },
    url: absoluteUrl(vetPath(`/servicios/${s.slug}`)),
    ...(s.price != null ? { offers: { "@type": "Offer", price: s.price, priceCurrency: "ARS" } } : {}),
  };
}

export function faqJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.filter((f) => f.visible).map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
}
