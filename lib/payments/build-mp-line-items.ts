/** Reparte `finalTotal` entre líneas del carrito para que MP sume exacto (descuentos %). */

export type CartLineForMp = { id?: string; name: string; price: number; quantity: number };

export type MpLineItem = {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: "ARS";
};

export function sumCartSubtotal(lines: CartLineForMp[]): number {
  return lines.reduce((s, l) => s + Number(l.price) * Math.max(1, Number(l.quantity) || 1), 0);
}

export function buildMpLineItems(lines: CartLineForMp[], subtotal: number, finalTotal: number): MpLineItem[] {
  if (!lines.length) return [];
  const ft = Math.round(finalTotal * 100) / 100;
  if (subtotal <= 0) {
    return [
      {
        id: "1",
        title: "Consumo",
        quantity: 1,
        unit_price: ft,
        currency_id: "ARS",
      },
    ];
  }
  const factor = ft / subtotal;
  const out: MpLineItem[] = [];
  let allocated = 0;
  for (let i = 0; i < lines.length; i++) {
    const c = lines[i];
    const qty = Math.max(1, Number(c.quantity) || 1);
    const lineSub = Number(c.price) * qty;
    const isLast = i === lines.length - 1;
    const lineTotal = isLast
      ? Math.round((ft - allocated) * 100) / 100
      : Math.round(lineSub * factor * 100) / 100;
    allocated += lineTotal;
    const unit = Math.round((lineTotal / qty) * 100) / 100;
    out.push({
      id: String(i + 1),
      title: String(c.name ?? "Producto").slice(0, 256),
      quantity: qty,
      unit_price: unit,
      currency_id: "ARS",
    });
  }
  return out;
}

export function mpItemsTotal(items: MpLineItem[]): number {
  return items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
}
