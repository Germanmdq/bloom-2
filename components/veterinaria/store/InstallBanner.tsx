"use client";
/**
 * Invitación a instalar la app (Android/Chrome/Edge: evento nativo;
 * iPhone/iPad: instrucciones "Compartir → Agregar a inicio").
 * Aparece recién en la segunda visita y se puede descartar por 30 días.
 */
import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { track } from "@/lib/vet/client/analytics";

interface BIPEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const KEY = "vdp:install";

export function InstallBanner() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    if (standalone) return;
    let state: { visits: number; dismissedAt?: number } = { visits: 0 };
    try {
      state = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      state.visits = (state.visits ?? 0) + 1;
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
    const eligible = state.visits >= 2 && (!state.dismissedAt || Date.now() - state.dismissedAt > 30 * 86_400_000);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      if (eligible) setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIos);
    if (isIos && eligible) setShow(true);
    const onInstalled = () => {
      track("pwa_install");
      setShow(false);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      const s = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      localStorage.setItem(KEY, JSON.stringify({ ...s, dismissedAt: Date.now() }));
    } catch {}
  };

  if (!show) return null;
  return (
    <aside aria-label="Instalar la app" className="fixed inset-x-3 top-3 z-[60] mx-auto max-w-md vet-rise">
      <div className="flex items-start gap-3 rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-black/5">
        <img src="/veterinaria/icons/icon-192.png" alt="" className="size-12 rounded-2xl ring-1 ring-black/5" width={48} height={48} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-vet-ink">Instalá la app de Vida de Perros</p>
          {ios && !evt ? (
            <p className="mt-0.5 text-xs leading-relaxed text-neutral-600">
              Tocá <Share className="inline size-3.5 align-[-2px]" aria-label="Compartir" /> y después <strong>«Agregar a inicio»</strong>. Entrás en un toque a la tienda y a tus turnos.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-neutral-600">Entrás en un toque a la tienda, tus pedidos y tus turnos. Funciona aunque tengas poca señal.</p>
          )}
          {evt && (
            <button
              type="button"
              onClick={async () => {
                await evt.prompt();
                const choice = await evt.userChoice;
                if (choice.outcome === "accepted") track("pwa_install");
                setShow(false);
              }}
              className="mt-2.5 inline-flex h-10 items-center gap-2 rounded-xl bg-vet-primary px-4 text-sm font-bold text-white"
            >
              <Download className="size-4" /> Instalar
            </button>
          )}
        </div>
        <button type="button" onClick={dismiss} className="grid size-9 place-items-center rounded-full text-neutral-500 hover:bg-black/5" aria-label="Ahora no">
          <X className="size-4" />
        </button>
      </div>
    </aside>
  );
}
