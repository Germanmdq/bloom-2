"use client";

import React, { useState } from "react";
import Image from "next/image";
import { usePWA } from "./PWAProvider";

export default function InstallPrompt() {
  const { isInstallable, isInstalled, isIOS, showBanner, promptInstall, dismissBanner } = usePWA();
  const [showIosGuide, setShowIosGuide] = useState(false);

  // Si ya está instalada o no hay evento, no mostrar
  if (isInstalled) return null;
  if (!showBanner && !showIosGuide) return null;

  return (
    <aside
      aria-label="Instalar aplicación"
      className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-[90] animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-[#777b5b] text-[#fffdf8] border border-[#c4b896]/35 rounded-[24px] p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-3.5">
          <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-[#c4b896]/40 bg-[#12221c] shadow-md">
            <Image
              src="/icons/icon-192x192.png"
              alt="Bloom App Icon"
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-[#f5e8ca] leading-tight truncate">
                Instalar Bloom Café
              </h4>
              <span className="text-[9px] bg-[#c4b896]/20 text-[#c4b896] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                App
              </span>
            </div>
            <p className="text-xs text-[#ebe8d6] leading-snug mt-1">
              Accedé al menú más rápido, pedí sin demoras y usala sin conexión.
            </p>

            {/* Badges de beneficios */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <span className="text-[10px] bg-white/10 text-[#f5e8ca] px-2 py-0.5 rounded-md font-medium">
                ⚡ Abre al instante
              </span>
              <span className="text-[10px] bg-white/10 text-[#f5e8ca] px-2 py-0.5 rounded-md font-medium">
                📶 Modo sin conexión
              </span>
            </div>
          </div>

          <button
            onClick={dismissBanner}
            className="text-[#ebe8d6] hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Cerrar aviso de instalación"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {showIosGuide ? (
          <div className="mt-4 pt-3.5 border-t border-[#c4b896]/20 text-xs text-[#eceae0] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-[#f5e8ca]">
              <span>Paso 1:</span>
              <span>Toca el botón <strong>Compartir</strong></span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#c4b896]">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              <span>en Safari</span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-[#f5e8ca]">
              <span>Paso 2:</span>
              <span>Elegí <strong>&quot;Añadir a pantalla de inicio&quot;</strong> 📲</span>
            </div>
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowIosGuide(false)}
                className="text-xs text-[#c4b896] hover:text-white font-bold"
              >
                Entendido
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3.5 flex items-center justify-end gap-2 pt-2.5 border-t border-[#c4b896]/20">
            <button
              onClick={dismissBanner}
              className="text-xs text-[#ebe8d6] hover:text-white px-3 py-1.5 rounded-xl transition-colors font-medium"
            >
              Ahora no
            </button>
            {isIOS ? (
              <button
                onClick={() => setShowIosGuide(true)}
                className="text-xs font-bold bg-[#c4b896] hover:bg-[#f5e8ca] text-[#4b4e38] px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
              >
                ¿Cómo instalar?
              </button>
            ) : (
              <button
                onClick={promptInstall}
                disabled={!isInstallable}
                className="text-xs font-bold bg-[#c4b896] hover:bg-[#f5e8ca] text-[#4b4e38] px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                Instalar App
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
