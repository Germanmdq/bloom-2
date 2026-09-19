"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function IngresarInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Link inválido. Pedile uno nuevo por WhatsApp.");
      return;
    }
    window.location.href = `/api/auth/login?t=${encodeURIComponent(token)}`;
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bloom-page px-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-ink-800 font-semibold text-lg mb-2">Link inválido</p>
          <p className="text-ink-500 text-sm mb-6">{error}</p>
          <a
            href="/auth"
            className="inline-flex items-center justify-center rounded-xl bg-english-800 px-6 py-3 text-sm font-semibold text-white hover:bg-english-700 transition-colors"
          >
            Ir al inicio de sesión
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bloom-page">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-english-800 flex items-center justify-center mx-auto mb-5 text-2xl animate-pulse">
          ☕
        </div>
        <p className="text-ink-700 font-semibold text-base">Iniciando sesión…</p>
        <p className="text-ink-400 text-sm mt-1">Te llevamos a tu cuenta</p>
      </div>
    </div>
  );
}

export default function IngresarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-bloom-page">
          <div className="w-14 h-14 rounded-full bg-english-800 flex items-center justify-center mx-auto text-2xl animate-pulse">
            ☕
          </div>
        </div>
      }
    >
      <IngresarInner />
    </Suspense>
  );
}
