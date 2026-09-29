"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { syncOfflineOrders } from "@/lib/offline/order-queue";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isOnline: boolean;
  showBanner: boolean;
  promptInstall: () => Promise<void>;
  dismissBanner: () => void;
}

const PWAContext = createContext<PWAContextType>({
  isInstallable: false,
  isInstalled: false,
  isIOS: false,
  isOnline: true,
  showBanner: false,
  promptInstall: async () => {},
  dismissBanner: () => {},
});

export function usePWA() {
  return useContext(PWAContext);
}

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 0. Online status
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = async () => {
      setIsOnline(true);
      toast.success("¡Conexión recuperada! 🌐", {
        description: "Sincronizando pedidos pendientes con el local...",
      });
      const { synced } = await syncOfflineOrders();
      if (synced > 0) {
        toast.success(`¡Listo! Se envió tu pedido guardado (${synced}) al sistema 🎉`);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Modo sin conexión activado 📶", {
        description: "Podés seguir navegando la carta y armar tu pedido.",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check for any pending sync
    if (navigator.onLine) {
      void syncOfflineOrders().then(({ synced }) => {
        if (synced > 0) {
          toast.success(`Se sincronizaron ${synced} pedido(s) pendientes 🎉`);
        }
      });
    }

    // 1. Detect if already running standalone
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari standalone check
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream: unknown }).MSStream;
    setIsIOS(isIosDevice);

    // 3. Register Service Worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("[PWA] ServiceWorker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.warn("[PWA] ServiceWorker registration failed:", error);
          });
      });
    }

    // 4. Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);

      // Check if user dismissed recently (24h cooldown)
      const dismissedAt = localStorage.getItem("bloom_pwa_dismissed");
      if (!dismissedAt || Date.now() - parseInt(dismissedAt, 10) > 24 * 60 * 60 * 1000) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowBanner(false);
      setDeferredPrompt(null);
      console.log("[PWA] Bloom PWA was installed!");
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error("[PWA] Error prompting install:", err);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem("bloom_pwa_dismissed", Date.now().toString());
  };

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isIOS,
        isOnline,
        showBanner,
        promptInstall,
        dismissBanner,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}
