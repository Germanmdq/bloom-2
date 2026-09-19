/**
 * Thermal Printer Kitchen Ticket formatting and direct printing utility (80mm & 58mm).
 * Sends formatted production orders directly to kitchen receipt printers.
 */

export interface PrintableKitchenTicket {
    id?: string;
    table_id?: number | string | null;
    customer_name?: string;
    items: Array<{
        name: string;
        quantity: number;
        notes?: string;
        price?: number;
    }>;
    notes?: string;
    created_at?: string;
    order_type?: string;
}

export function printKitchenTicket(ticket: PrintableKitchenTicket, options?: { is58mm?: boolean }) {
    if (typeof window === "undefined") return;

    const widthMm = options?.is58mm ? "58mm" : "80mm";
    const esc = (s: unknown) =>
        String(s ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");

    const date = ticket.created_at ? new Date(ticket.created_at) : new Date();
    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const dateStr = date.toLocaleDateString("es-AR");

    const tableLabel = ticket.table_id 
        ? `MESA ${ticket.table_id}` 
        : (ticket.order_type === "web" ? "PEDIDO WEB" : "MOSTRADOR / RETIRO");

    const itemsHtml = (ticket.items || []).map((item) => {
        const qty = Number(item.quantity || 1);
        const itemNote = item.notes ? `<div class="item-note">↳ ${esc(item.notes)}</div>` : "";
        return `
            <div class="row">
                <div class="item-info">
                    <span class="item-name">${esc(item.name)}</span>
                    ${itemNote}
                </div>
                <div class="item-qty">×${qty}</div>
            </div>
        `;
    }).join("");

    const totalItems = (ticket.items || []).reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
    const shortId = ticket.id ? String(ticket.id).slice(0, 6).toUpperCase() : "";

    const ticketHtml = `
        <div class="ticket">
            <div class="center head">
                <div class="h1">COMANDA</div>
                <div class="sub">COCINA • ORDEN DE PRODUCCIÓN</div>
                <div class="dash"></div>
                <div class="meta">
                    <span class="table-badge">${esc(tableLabel)}</span>
                    <span class="time-badge">${timeStr}</span>
                </div>
                <div class="meta-sub">${dateStr} ${shortId ? `· #${shortId}` : ""}</div>
            </div>

            <div class="cols-header">
                <div>ÍTEM / DESCRIPCIÓN</div>
                <div style="text-align:right">CANT</div>
            </div>

            ${itemsHtml}

            ${ticket.notes ? `
                <div class="notes-box">
                    <div class="notes-title">⚠️ NOTAS / OBSERVACIONES:</div>
                    <div class="notes-body">${esc(ticket.notes)}</div>
                </div>
            ` : ""}

            <div class="summary-line">
                <span>TOTAL ÍTEMS:</span>
                <span>${totalItems} un.</span>
            </div>

            <div class="end">
                <div>--- FIN DE COMANDA ---</div>
            </div>
        </div>
    `;

    const css = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @page { margin: 0; size: ${widthMm} auto; }
        body { 
            width: ${widthMm}; 
            margin: 0; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Courier New', monospace; 
            color: #000; 
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .ticket { width: 100%; padding: 2mm 3mm; position: relative; }
        .center { text-align: center; }
        .h1 { font-size: 26px; font-weight: 900; letter-spacing: -0.02em; line-height: 1; }
        .sub { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; margin-top: 3px; }
        .dash { border-bottom: 2px dashed #000; margin: 6px 0; }
        .meta { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
        .table-badge { font-size: 18px; font-weight: 900; }
        .time-badge { font-size: 16px; font-weight: 900; }
        .meta-sub { font-size: 10px; color: #444; text-align: left; margin-top: 2px; font-weight: 600; }
        .cols-header { 
            display: grid; 
            grid-template-columns: 1fr 44px; 
            gap: 4px; 
            font-size: 11px; 
            font-weight: 900; 
            border-bottom: 2px solid #000; 
            padding: 4px 0 2px; 
            margin-top: 6px; 
        }
        .row { 
            display: grid; 
            grid-template-columns: 1fr 44px; 
            gap: 4px; 
            padding: 5px 0; 
            border-bottom: 1px dashed #777; 
            align-items: start; 
        }
        .item-name { font-size: 15px; font-weight: 800; display: block; line-height: 1.2; }
        .item-note { font-size: 11px; font-style: italic; font-weight: 700; color: #333; margin-top: 2px; }
        .item-qty { text-align: right; font-weight: 900; font-size: 18px; }
        .notes-box { 
            margin-top: 8px; 
            border: 2px solid #000; 
            padding: 6px; 
            background: #f0f0f0; 
        }
        .notes-title { font-size: 11px; font-weight: 900; }
        .notes-body { font-size: 13px; font-weight: 700; margin-top: 2px; line-height: 1.2; }
        .summary-line { 
            display: flex; 
            justify-content: space-between; 
            font-size: 13px; 
            font-weight: 900; 
            border-top: 2px solid #000; 
            margin-top: 8px; 
            padding-top: 4px; 
        }
        .end { 
            text-align: center; 
            font-size: 11px; 
            font-weight: 800; 
            padding: 8px 0 4px; 
            border-top: 1px dashed #000; 
            margin-top: 8px; 
            letter-spacing: .08em; 
        }
    `;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:80mm;height:1px;border:0;visibility:hidden;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument ?? iframe.contentWindow!.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comanda - Bloom</title><style>${css}</style></head><body>${ticketHtml}</body></html>`);
    doc.close();

    const cleanup = () => {
        try {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        } catch {}
    };

    iframe.contentWindow!.addEventListener("afterprint", () => setTimeout(cleanup, 300), { once: true });
    setTimeout(cleanup, 12000);

    setTimeout(() => {
        try {
            iframe.contentWindow!.focus();
            iframe.contentWindow!.print();
        } catch {
            cleanup();
        }
    }, 100);
}
