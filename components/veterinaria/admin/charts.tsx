"use client";
/**
 * Gráficos livianos (sin librerías): barras de una sola serie en el color
 * de la marca, tooltip al pasar/tocar, eje y grilla recesivos y una tabla
 * accesible para lectores de pantalla. Una sola escala por gráfico.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface Datum {
  label: string;
  value: number;
  /** Texto extra para el tooltip (ej. "4 pedidos"). */
  hint?: string;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / p) * p;
}

export function BarChart({ data, format = (v) => String(v), height = 180, title, highlightLast }: { data: Datum[]; format?: (v: number) => string; height?: number; title: string; highlightLast?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const denseLabels = data.length > 12;
  return (
    <figure className="relative" aria-label={title}>
      <div className="relative" style={{ height }}>
        {/* Grilla recesiva */}
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-black/[0.07]" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -top-2.5 right-0 bg-white pl-1 text-[10px] tabular-nums text-neutral-400">{f === 0 ? "" : format(max * f)}</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-[2px] pr-12" onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => {
            const h = (d.value / max) * 100;
            const active = hover === i;
            const strong = highlightLast ? i === data.length - 1 : true;
            return (
              <button
                key={d.label + i}
                type="button"
                className="group relative flex h-full flex-1 items-end outline-none"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onClick={() => setHover(i)}
                aria-label={`${d.label}: ${format(d.value)}${d.hint ? `, ${d.hint}` : ""}`}
              >
                <span
                  className={cn("mx-auto w-full max-w-9 rounded-t-[4px] transition-[height,opacity] duration-500", strong ? "bg-vet-primary" : "bg-vet-primary/45", hover != null && !active && "opacity-50")}
                  style={{ height: `${Math.max(d.value > 0 ? 2 : 0, h)}%` }}
                />
              </button>
            );
          })}
        </div>
        {hover != null && data[hover] && (
          <div className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-vet-ink px-2.5 py-1.5 text-xs text-white shadow-lg" style={{ left: `calc(${((hover + 0.5) / data.length) * 100}% - ${((hover + 0.5) / data.length) * 48}px)` }}>
            <p className="font-semibold">{data[hover].label}</p>
            <p className="tabular-nums">{format(data[hover].value)}{data[hover].hint ? ` · ${data[hover].hint}` : ""}</p>
          </div>
        )}
      </div>
      <div className="mt-1.5 flex gap-[2px] pr-12">
        {data.map((d, i) => (
          <span key={d.label + i} className={cn("flex-1 truncate text-center text-[10px] text-neutral-500", denseLabels && i % Math.ceil(data.length / 8) !== 0 && "invisible")}>
            {d.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function HBarList({ items, format = (v) => String(v), empty = "Sin datos todavía", title }: { items: Datum[]; format?: (v: number) => string; empty?: string; title: string }) {
  if (!items.length || items.every((i) => i.value === 0)) return <p className="py-6 text-center text-sm text-neutral-500">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5" aria-label={title}>
      {items.map((it) => (
        <li key={it.label} title={`${it.label}: ${format(it.value)}${it.hint ? ` · ${it.hint}` : ""}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-vet-ink">{it.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-vet-ink">
              {format(it.value)}
              {it.hint && <span className="ml-1.5 text-xs font-normal text-neutral-500">{it.hint}</span>}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/[0.05]">
            <div className="h-full rounded-full bg-vet-primary transition-[width] duration-500" style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
