"use client";

import { CartItem } from "@/lib/store/order-store";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface ReceiptModalProps {
    tableId: number;
    invoiceType: string;
    extraTotal: number;
    cart: CartItem[];
    total: number;
    customerName?: string;
    customerId?: string | null;
    isKitchen?: boolean;
    isPreview?: boolean;
    // Factura C / ARCA
    cae?: string;
    voucherNumber?: number;
    caeExpiration?: string;
    onClose: () => void;
}

const CUIT  = "23-35420718-4";
const CUIT_RAW = "23354207184";
const PTO_VTA = 4;
const TIPO_CMP = 11; // Factura C

function formatVoucherNumber(n?: number): string {
    if (!n) return "0000-00000000";
    return `${String(PTO_VTA).padStart(4, "0")}-${String(n).padStart(8, "0")}`;
}

function buildAfipQrUrl(cae: string, voucherNumber: number, total: number): string {
    const today = new Date().toISOString().split("T")[0];
    const payload = {
        ver: 1,
        fecha: today,
        cuit: parseInt(CUIT_RAW),
        ptoVta: PTO_VTA,
        tipoCmp: TIPO_CMP,
        nroCmp: voucherNumber,
        importe: Math.round(total * 100) / 100,
        moneda: "PES",
        ctz: 1,
        tipoDocRec: 99,
        nroDocRec: 0,
        tipoCodAut: "E",
        codAut: parseInt(cae),
    };
    return `https://www.afip.gob.ar/fe/qr/?p=${btoa(JSON.stringify(payload))}`;
}

export function ReceiptModal({
    tableId, invoiceType, cart, total, customerName, customerId, isKitchen = false, isPreview = false,
    cae, voucherNumber, caeExpiration, onClose,
}: ReceiptModalProps) {
    const printedRef = useRef(false);
    const [customerCuit, setCustomerCuit] = useState<string | null | undefined>(customerId && !isKitchen ? undefined : null);

    useEffect(() => {
        if (!customerId || isKitchen) {
            setCustomerCuit(null);
            return;
        }

        let cancelled = false;
        createClient().from("profiles").select("cuit").eq("id", customerId).maybeSingle()
            .then(({ data }) => {
                if (!cancelled) setCustomerCuit(data?.cuit?.trim() || null);
            });

        return () => { cancelled = true; };
    }, [customerId, isKitchen]);

    useEffect(() => {
        if (customerId && !isKitchen && customerCuit === undefined) return;
        if (printedRef.current) return;
        printedRef.current = true;

        const esc = (s: unknown) =>
            String(s ?? "")
                .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

        const now = new Date();
        const dateStr = now.toLocaleDateString("es-AR");
        const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const headerLeft = customerName ? `${isKitchen ? "Alias" : "Cliente"}: ${customerName}` : `Mesa: ${tableId}`;
        const isLegal = !!cae && !!voucherNumber;
        const isSinValidez = invoiceType === 'Sin Validez' || isPreview;

        const itemsHtml = cart.map((item) => {
            const qty = Number(item.quantity || 1);
            const price = Number((item as any)?.price || 0);
            const notes = (item as any)?.notes ? `<div class="note">↳ ${esc((item as any).notes)}</div>` : "";
            return isKitchen
                ? `<div class="row"><div class="name"><span class="item-name">${esc(item.name)}</span>${notes}</div><div class="qty">×${qty}</div></div>`
                : `<div class="row"><div class="name"><span class="item-name">${esc(item.name)}</span>${notes}</div><div class="qty">×${qty}</div><div class="price">$${(price * qty).toLocaleString("es-AR")}</div></div>`;
        }).join("");

        const itemsCount = cart.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

        // ── COMANDA ──────────────────────────────────────────
        if (isKitchen) {
            const html = `<div class="ticket">
  <div class="center head">
    <div class="h1">COMANDA</div>
    <div class="sub">ORDEN DE PRODUCCIÓN</div>
    <div class="dash"/>
    <div class="meta"><span>${esc(headerLeft)}</span><span>${timeStr}</span></div>
  </div>
  <div class="cols-header"><div>ÍTEM</div><div style="text-align:right">CANT</div></div>
  ${itemsHtml}
  <div class="end">--- FIN DE COMANDA ---</div>
</div>`;
            renderAndPrint(html, "", onClose);
            return;
        }

        // ── TICKET SIN VALIDEZ ────────────────────────────────
        if (isSinValidez) {
            const html = `<div class="ticket">
  <div class="watermark">${isPreview ? 'PRE-CUENTA' : 'NO VÁLIDO COMO FACTURA'}</div>
  <div class="center head">
    <div class="h1">BLOOM</div>
    <div class="sub">Coffee &amp; More · ${dateStr}</div>
    <div class="dash"/>
    <div class="meta"><span>${esc(headerLeft)}</span><span>${timeStr}</span></div>
    ${customerName && customerCuit ? `<div class="cuit">CUIT: ${esc(customerCuit)}</div>` : ""}
  </div>
  <div class="cols-header"><div>ÍTEM</div><div style="text-align:right">CANT</div><div style="text-align:right">TOTAL</div></div>
  ${itemsHtml}
  <div class="sum">
    <div class="sumline"><span>TOTAL</span><span>$${Number(total).toLocaleString("es-AR")}</span></div>
    <div class="sumsub"><span>${itemsCount} ítems</span><span>Pendiente de facturar</span></div>
  </div>
  <div class="end no-fiscal">DOCUMENTO NO VÁLIDO COMO FACTURA<br/>Solo para control interno del establecimiento</div>
</div>`;
            renderAndPrint(html, "", onClose);
            return;
        }

        // ── FACTURA C ─────────────────────────────────────────
        // Generate AFIP QR as data URL before injecting HTML so it's ready when the print dialog opens
        const buildFacturaHtml = (qrDataUrl: string) => {
            const afipQrSection = isLegal
                ? `<div class="legal-block">
                    <div class="legal-row"><span class="label-sm">CAE</span><span class="value-sm">${esc(cae)}</span></div>
                    <div class="legal-row"><span class="label-sm">Vto. CAE</span><span class="value-sm">${esc(caeExpiration ?? "")}</span></div>
                    ${qrDataUrl ? `<div class="qr-wrap"><img src="${qrDataUrl}" width="150" height="150" alt="QR AFIP"/></div>` : ""}
                    <div class="hint-sm">Verificar en ARCA / AFIP</div>
                  </div>`
                : "";

            return `<div class="ticket">
  <div class="center head">
    <div class="h1">BLOOM</div>
    <div class="sub">Coffee &amp; More</div>
    <div class="addr">Brown 2021 PB 5, Mar del Plata</div>
    <div class="cuit">CUIT: ${CUIT}</div>
    <div class="dash"/>
    <div class="comp-box">
      <div class="comp-type">FACTURA C</div>
      <div class="comp-num">${formatVoucherNumber(voucherNumber)}</div>
    </div>
    <div class="comp-date">${dateStr} · ${timeStr}</div>
    <div class="comp-cf">${customerName ? `Cliente: ${esc(customerName)}` : "Consumidor Final"}</div>
    ${customerName && customerCuit ? `<div class="cuit">CUIT: ${esc(customerCuit)}</div>` : ""}
  </div>
  <div class="dash"/>
  <div class="cols-header"><div>ÍTEM</div><div style="text-align:right">CANT</div><div style="text-align:right">TOTAL</div></div>
  ${itemsHtml}
  <div class="sum">
    <div class="sumline"><span>TOTAL</span><span>$${Number(total).toLocaleString("es-AR")}</span></div>
    <div class="sumsub"><span>${itemsCount} ítems</span><span>IVA incl.</span></div>
  </div>
  ${afipQrSection}
  <div class="end">
    <div>¡GRACIAS POR TU VISITA!</div>
    <div class="site">bloommdp.com</div>
  </div>
</div>`;
        };

        if (isLegal) {
            const qrUrl = buildAfipQrUrl(cae!, voucherNumber!, total);
            QRCode.toDataURL(qrUrl, { width: 150, margin: 1, errorCorrectionLevel: "M" })
                .then((dataUrl) => {
                    renderAndPrint(buildFacturaHtml(dataUrl), "kitchen", onClose);
                })
                .catch(() => {
                    // fallback: print without QR rather than blocking
                    renderAndPrint(buildFacturaHtml(""), "", onClose);
                });
        } else {
            renderAndPrint(buildFacturaHtml(""), "", onClose);
        }
    }, [cart, customerName, customerId, customerCuit, isKitchen, onClose, tableId, total, cae, voucherNumber, caeExpiration, invoiceType]);

    return null;
}

function renderAndPrint(ticketHtml: string, _unused: string, onClose: () => void) {
    const isKitchen = ticketHtml.includes("COMANDA");
    const cols = isKitchen ? "1fr 40px" : "1fr 28px 64px";

    const css = `
      * { box-sizing:border-box; margin:0; padding:0; }
      @page { margin:0; size:80mm auto; }
      body { width:80mm; margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif; color:#000; background:#fff; }
      .ticket { width:100%; padding:2mm 4mm; position:relative; }
      .center { text-align:center; }
      .h1 { font-size:28px; font-weight:900; letter-spacing:-0.03em; line-height:1; }
      .sub { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.12em; margin-top:3px; }
      .addr { font-size:11px; margin-top:2px; }
      .cuit { font-size:11px; font-weight:700; margin-top:1px; }
      .dash { border-bottom:1px dashed #000; margin:6px 0; }
      .meta { display:flex; justify-content:space-between; font-size:13px; font-weight:700; }
      .comp-box { margin:6px 0 2px; border:1px solid #000; padding:4px 6px; display:inline-block; }
      .comp-type { font-size:16px; font-weight:900; letter-spacing:.05em; }
      .comp-num { font-size:13px; font-weight:700; }
      .comp-date { font-size:11px; margin-top:2px; }
      .comp-cf { font-size:11px; font-weight:700; margin-top:1px; }
      .cols-header { display:grid; grid-template-columns:${cols}; gap:4px; font-size:11px; font-weight:900; border-bottom:1px solid #000; padding-bottom:3px; margin-bottom:2px; }
      .row { display:grid; grid-template-columns:${cols}; gap:4px; padding:4px 0; border-bottom:1px dashed #e5e7eb; font-size:14px; line-height:1.3; align-items:start; }
      .name { min-width:0; }
      .item-name { font-weight:800; display:block; }
      .note { font-size:11px; font-style:italic; color:#555; margin-top:1px; }
      .qty, .price { text-align:right; font-weight:700; }
      .sum { border-top:2px solid #000; padding-top:6px; margin-top:4px; }
      .sumline { display:flex; justify-content:space-between; font-size:22px; font-weight:900; letter-spacing:-0.02em; }
      .sumsub { display:flex; justify-content:space-between; font-size:11px; font-weight:700; opacity:.6; margin-top:1px; }
      .legal-block { border-top:1px dashed #000; margin-top:8px; padding-top:6px; text-align:center; }
      .legal-row { display:flex; justify-content:space-between; font-size:11px; padding:1px 0; }
      .label-sm { font-weight:900; }
      .value-sm { font-weight:700; }
      .qr-wrap { display:flex; justify-content:center; margin:6px 0 4px; }
      .qr-wrap img { width:150px; height:150px; image-rendering:pixelated; }
      .hint-sm { font-size:10px; color:#555; }
      .end { text-align:center; font-size:13px; font-weight:800; padding:10px 0 0; border-top:1px dashed #000; margin-top:8px; }
      .site { font-size:11px; margin-top:2px; opacity:.7; }
      .no-fiscal { font-size:12px; font-weight:900; margin-top:4px; }
      .watermark { font-size:12px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; text-align:center; border:1px solid #000; padding:3px; margin-bottom:6px; }
    `;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:80mm;height:1px;border:0;visibility:hidden;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument ?? iframe.contentWindow!.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${ticketHtml}</body></html>`);
    doc.close();

    const doClose = () => {
        try { document.body.removeChild(iframe); } catch {}
        onClose();
    };

    iframe.contentWindow!.addEventListener("afterprint", () => setTimeout(doClose, 300), { once: true });
    setTimeout(doClose, 10000); // fallback

    // Small delay for iframe to finish layout before printing
    setTimeout(() => {
        try { iframe.contentWindow!.print(); } catch { doClose(); }
    }, 80);
}
