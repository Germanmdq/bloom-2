"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import QRCode from "react-qr-code";

function QRDisplay() {
  const params = useSearchParams();
  const url = params.get("url");
  const amount = params.get("amount");

  if (!url) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <p className="text-gray-400 font-bold">Sin QR</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-white gap-8 px-8">
      <div className="flex flex-col items-center gap-2">
        <img src="/logo.png" alt="Bloom" className="h-12 object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
        <p className="text-2xl font-black text-gray-900 tracking-tight">Bloom Café</p>
      </div>

      {amount && (
        <p className="text-5xl font-black text-gray-900 tabular-nums">{amount}</p>
      )}

      <div className="rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
        <QRCode value={url} size={260} />
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-base font-black text-gray-700">Escaneá con Mercado Pago</p>
        <p className="text-sm font-medium text-gray-400">Abrí la app → Escaner → Apuntá acá</p>
      </div>
    </div>
  );
}

export default function QRDisplayPage() {
  return (
    <Suspense>
      <QRDisplay />
    </Suspense>
  );
}
