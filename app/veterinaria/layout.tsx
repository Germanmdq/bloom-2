import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { BUSINESS } from "@/lib/vet/config/business";
import { INTEGRATIONS, VET_BASE } from "@/lib/vet/config/integrations";
import { getPublicCatalog } from "@/lib/vet/server/catalog";
import { VetRoot } from "@/components/veterinaria/VetRoot";

const display = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-vet-display", display: "swap", weight: ["500", "600", "700", "800"] });

const SPLASHES: [number, number, number][] = [
  [750, 1334, 2], [828, 1792, 2], [1125, 2436, 3], [1170, 2532, 3], [1179, 2556, 3], [1242, 2688, 3], [1284, 2778, 3], [1290, 2796, 3], [1536, 2048, 2], [1668, 2388, 2], [2048, 2732, 2],
];

export const metadata: Metadata = {
  metadataBase: new URL(INTEGRATIONS.siteUrl),
  title: {
    default: `${BUSINESS.name} | Veterinaria, peluquería canina y pet shop`,
    template: `%s | ${BUSINESS.name}`,
  },
  description: BUSINESS.description,
  applicationName: BUSINESS.name,
  manifest: `${VET_BASE}/manifest.webmanifest`,
  keywords: ["veterinaria", "pet shop", "peluquería canina", "baño para perros", "turnos veterinaria", "accesorios para mascotas", "farmacia veterinaria"],
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: BUSINESS.name,
    title: `${BUSINESS.name} — ${BUSINESS.tagline}`,
    description: BUSINESS.description,
    images: [{ url: `${VET_BASE}/icons/icon-512.png`, width: 512, height: 512, alt: BUSINESS.logoAlt }],
  },
  twitter: { card: "summary", title: BUSINESS.name, description: BUSINESS.description },
  icons: {
    icon: [
      { url: `${VET_BASE}/icons/favicon-32.png`, sizes: "32x32", type: "image/png" },
      { url: `${VET_BASE}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: `${VET_BASE}/icons/apple-touch-icon.png`, sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: BUSINESS.name,
    statusBarStyle: "default",
    startupImage: SPLASHES.map(([w, h, r]) => ({
      url: `${VET_BASE}/icons/splash-${w}x${h}.png`,
      media: `(device-width: ${w / r}px) and (device-height: ${h / r}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
    })),
  },
  formatDetection: { telephone: true },
  verification: INTEGRATIONS.googleSiteVerification ? { google: INTEGRATIONS.googleSiteVerification } : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: BUSINESS.colors.primary,
  colorScheme: "light",
};

export default async function VeterinariaLayout({ children }: { children: React.ReactNode }) {
  const { settings } = await getPublicCatalog();
  const c = settings.business.colors;
  const style = {
    "--vet-primary": c.primary,
    "--vet-primary-dark": c.primaryDark,
    "--vet-accent": c.accent,
    "--vet-warm": c.warm,
    "--vet-surface": c.surface,
    "--vet-ink": c.ink,
  } as React.CSSProperties;

  return (
    <div className={`vet-app ${display.variable} min-h-dvh bg-vet-surface font-sans text-vet-ink`} style={style}>
      <VetRoot gaId={INTEGRATIONS.googleAnalyticsId}>{children}</VetRoot>
    </div>
  );
}
