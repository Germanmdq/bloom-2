"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { IconPrinter, IconQrcode, IconPencil, IconCheck, IconX, IconAlertTriangle } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";
import { useEscape } from "@/lib/hooks/useEscape";

type TableEntry = { id: number; label: string; zone: string };

const ZONES: { label: string; color: string; tables: TableEntry[] }[] = [
  {
    label: "Abajo",
    color: "text-gray-400",
    tables: Array.from({ length: 9 }, (_, i) => ({ id: i + 1, label: String(i + 1), zone: "Abajo" })),
  },
  {
    label: "Deck",
    color: "text-blue-500",
    tables: Array.from({ length: 8 }, (_, i) => ({ id: 20 + i, label: String(20 + i), zone: "Deck" })),
  },
  {
    label: "Arriba",
    color: "text-amber-500",
    tables: Array.from({ length: 8 }, (_, i) => ({ id: 30 + i, label: String(30 + i), zone: "Arriba" })),
  },
];

function tableUrl(baseUrl: string, table: TableEntry) {
  return `${baseUrl}/menu?table=${table.id}&zona=mesa&num=${table.label}&sector=${encodeURIComponent(table.zone)}`;
}

function QRModal({ table, baseUrl, onClose }: { table: TableEntry; baseUrl: string; onClose: () => void }) {
  const url = tableUrl(baseUrl, table);

  function handlePrint() {
    const win = window.open("", "_blank", "width=420,height=580");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>QR Mesa ${table.label}</title>
    <style>
        body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;background:#fff}
        .card{display:flex;flex-direction:column;align-items:center;gap:10px;padding:32px;border:2px solid #e5e7eb;border-radius:20px}
        .zone{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;color:#9ca3af}
        .num{font-size:80px;font-weight:900;line-height:1;color:#111;margin:0}
        .hint{font-size:10px;color:#9ca3af;font-weight:600;margin-top:4px}
        @media print{body{margin:0}}
    </style></head><body>
    <div class="card">
        <p class="zone">${table.zone} · Mesa ${table.label}</p>
        <p class="num">${table.label}</p>
        <div id="qr"></div>
        <p class="hint">Escaneá para pedir</p>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
    <script>QRCode.toCanvas(document.createElement('canvas'),"${url}",{width:220,margin:1},function(e,c){if(!e)document.getElementById('qr').appendChild(c);setTimeout(()=>{window.print();window.close()},300)});</script>
    </body></html>`);
    win.document.close();
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-10 flex flex-col items-center gap-4 shadow-2xl relative border-4 border-gray-900"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-300 hover:text-gray-700 transition-colors">
          <IconX size={22} />
        </button>

        <p className="text-xs font-black uppercase tracking-widest text-gray-400">{table.zone}</p>
        <p className="text-8xl font-black text-gray-900 leading-none">{table.label}</p>

        <div className="my-2">
          <QRCodeSVG value={url} size={240} level="M" bgColor="#ffffff" fgColor="#000000" />
        </div>

        <p className="text-xs text-gray-400 font-medium">Escaneá para pedir</p>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 active:scale-95 transition-all mt-2 w-full justify-center"
        >
          <IconPrinter size={17} />
          Imprimir este QR
        </button>
      </div>
    </div>
  );
}

function QRCard({ table, baseUrl, onClick }: { table: TableEntry; baseUrl: string; onClick: () => void }) {
  const url = tableUrl(baseUrl, table);
  return (
    <button
      onClick={onClick}
      className="bg-white flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all w-full"
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{table.zone}</p>
      <p className="text-5xl font-black text-gray-900 leading-none">{table.label}</p>
      <div className="my-1 pointer-events-none">
        <QRCodeSVG value={url} size={130} level="M" bgColor="#ffffff" fgColor="#000000" />
      </div>
      <p className="text-[9px] text-gray-400 font-medium">Tocá para imprimir</p>
    </button>
  );
}

export default function QRCodesPage() {
  const supabase = createClient();
  const [baseUrl, setBaseUrl] = useState("");
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [selected, setSelected] = useState<TableEntry | null>(null);
  
  useEscape(() => setSelected(null));

  const isLocalhost = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const origin = window.location.origin;
    setBaseUrl(envUrl || origin);
    setUrlInput(envUrl || origin);

    supabase
      .from("app_settings")
      .select("site_url")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data?.site_url && !envUrl) {
          setBaseUrl(data.site_url);
          setUrlInput(data.site_url);
        }
      });
  }, []);

  const saveUrl = async () => {
    const clean = urlInput.replace(/\/$/, "");
    setBaseUrl(clean);
    setEditingUrl(false);
    await supabase.from("app_settings").update({ site_url: clean }).eq("id", 1);
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      {selected && <QRModal table={selected} baseUrl={baseUrl} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
          <IconQrcode size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Códigos QR</h1>
          <p className="text-gray-400 text-sm font-medium">Abajo 1–9 · Deck 20–27 · Arriba 30–37 — tocá para imprimir</p>
        </div>
      </div>

      {/* URL Banner */}
      <div className={`rounded-2xl border-2 p-4 space-y-2 ${isLocalhost ? "border-red-300 bg-red-50" : "border-green-200 bg-green-50"}`}>
        {isLocalhost && (
          <div className="flex items-center gap-2 text-red-600 font-black text-sm">
            <IconAlertTriangle size={16} />
            Los QR apuntan a localhost — los teléfonos no pueden escanearlos. Ingresá la URL de producción.
          </div>
        )}
        {!isLocalhost && (
          <p className="text-green-700 font-black text-sm flex items-center gap-1.5">
            <IconCheck size={15} /> QR apuntan a: <span className="font-medium">{baseUrl}</span>
          </p>
        )}
        {editingUrl ? (
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://tu-app.vercel.app"
              className="flex-1 px-3 py-2 rounded-xl border-2 border-gray-200 text-sm font-medium outline-none focus:border-black"
            />
            <button onClick={saveUrl} className="px-4 py-2 bg-black text-white rounded-xl text-sm font-black">Guardar</button>
            <button onClick={() => setEditingUrl(false)} className="px-3 py-2 bg-gray-100 rounded-xl text-sm"><IconX size={16} /></button>
          </div>
        ) : (
          <button
            onClick={() => setEditingUrl(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
          >
            <IconPencil size={12} /> Cambiar URL
          </button>
        )}
      </div>

      {/* Zones */}
      {ZONES.map(zone => (
        <section key={zone.label}>
          <h2 className={`text-xs font-black uppercase tracking-widest mb-4 ${zone.color}`}>
            {zone.label} — mesas {zone.tables[0].label}–{zone.tables[zone.tables.length - 1].label}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {zone.tables.map(t => (
              <QRCard key={t.id} table={t} baseUrl={baseUrl} onClick={() => setSelected(t)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
