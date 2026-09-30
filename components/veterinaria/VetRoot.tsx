"use client";
/**
 * Raíz del módulo: registra el service worker propio (/veterinaria/sw.js),
 * aplica los colores guardados en la configuración y carga Google Analytics
 * solo si está configurado.
 */
import { useEffect } from "react";
import Script from "next/script";
import { useSettings } from "@/lib/vet/client/store";
import { VET_BASE } from "@/lib/vet/config/integrations";

export function VetRoot({ children, gaId }: { children: React.ReactNode; gaId: string | null }) {
  const settings = useSettings();

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register(`${VET_BASE}/sw.js`, { scope: VET_BASE }).catch((err) => console.warn("[vet] SW", err));
  }, []);

  // Colores editables desde el panel: se aplican sin recargar.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".vet-app");
    if (!root) return;
    const c = settings.business.colors;
    root.style.setProperty("--vet-primary", c.primary);
    root.style.setProperty("--vet-primary-dark", c.primaryDark);
    root.style.setProperty("--vet-accent", c.accent);
    root.style.setProperty("--vet-warm", c.warm);
    root.style.setProperty("--vet-surface", c.surface);
    root.style.setProperty("--vet-ink", c.ink);
  }, [settings.business.colors]);

  return (
    <>
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="vet-ga" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId}');`}
          </Script>
        </>
      )}
      {children}
    </>
  );
}
