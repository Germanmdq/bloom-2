"use client";

import { useState } from "react";
import { IconCamera, IconFileInvoice, IconLoader2, IconUpload } from "@tabler/icons-react";

export default function CargarFacturasPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  async function upload() {
    if (!file) return;
    setStatus("uploading");
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setStatus("error"); setMessage("Escaneá el QR desde el panel de compras para abrir esta pantalla."); return; }
    const body = new FormData(); body.append("file", file); body.append("token", token);
    const res = await fetch("/api/invoice-capture", { method: "POST", body });
    const data = await res.json();
    setStatus(res.ok ? "done" : "error");
    setMessage(res.ok ? "Factura recibida. Ya aparece en el panel para revisar." : (data.error || "No se pudo subir el archivo."));
  }
  return <main className="min-h-screen bg-[#f7f5ef] px-5 py-10 text-gray-900"><div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-xl"><div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#eef4f0] text-[#2d4a3e]"><IconFileInvoice size={28}/></div><h1 className="text-2xl font-black">Cargar factura</h1><p className="mt-2 text-sm text-gray-500">Sacá una foto o elegí un PDF. Sirve para compras, gastos, servicios y comprobantes.</p><label className="mt-7 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#a8c9b8] bg-[#f8fbf9] p-5 text-center"><IconCamera size={30} className="text-[#3d6b52]"/><span className="mt-3 font-bold">{file ? file.name : "Foto o PDF de la factura"}</span><span className="mt-1 text-xs text-gray-500">Tocá para abrir la cámara o tus archivos</span><input className="sr-only" type="file" accept="image/*,application/pdf" capture="environment" onChange={e => setFile(e.target.files?.[0] ?? null)}/></label><button disabled={!file || status === "uploading"} onClick={upload} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2d4a3e] py-4 font-black text-white disabled:opacity-40">{status === "uploading" ? <IconLoader2 className="animate-spin"/> : <IconUpload size={19}/>} Subir comprobante</button>{status !== "idle" && <p className={`mt-4 text-center text-sm font-semibold ${status === "error" ? "text-red-600" : "text-[#2d4a3e]"}`}>{message}</p>}</div></main>;
}
