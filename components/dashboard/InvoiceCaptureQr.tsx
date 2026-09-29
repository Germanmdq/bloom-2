"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { IconQrcode, IconRefresh } from "@tabler/icons-react";

type CaptureSession = { url: string; expiresAt: string };

export function InvoiceCaptureQr() {
  const [session, setSession] = useState<CaptureSession | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createSession() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/invoice-capture/session", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo crear el QR.");
      setSession(data);
      setOpen(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear el QR.");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return <>
    <button type="button" onClick={createSession} disabled={loading} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-gray-700 transition hover:border-black hover:bg-black hover:text-white disabled:opacity-50">
      <IconQrcode size={18} /> {loading ? "Creando QR..." : "Cargar con QR"}
    </button>
    {open && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-5" onClick={() => setOpen(false)}>
      <div className="w-full max-w-sm rounded-[2rem] bg-white p-7 text-center shadow-2xl" onClick={event => event.stopPropagation()}>
        <h3 className="text-xl font-black">Escaneá para cargar facturas</h3>
        <p className="mt-2 text-sm text-gray-500">Sirve para foto o PDF de compras, gastos, servicios y comprobantes.</p>
        {session ? <>
          <div className="mx-auto my-6 w-fit rounded-2xl bg-white p-3 ring-1 ring-gray-100"><QRCodeSVG value={session.url} size={220} includeMargin /></div>
          <p className="text-xs font-bold text-amber-700">Este QR vence a las {new Date(session.expiresAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}.</p>
          <button type="button" onClick={createSession} className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-black"><IconRefresh size={15} /> Generar otro QR</button>
        </> : <p className="my-8 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
        <button type="button" onClick={() => setOpen(false)} className="mt-5 w-full rounded-xl bg-gray-100 py-3 text-xs font-black uppercase tracking-widest">Cerrar</button>
      </div>
    </div>}
  </>;
}
