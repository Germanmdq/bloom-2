"use client";

import { useEffect, useRef, useState } from "react";

const ROW = 44;
const VISIBLE = 5;

/**
 * Selector tipo rueda (como el de la alarma de iPhone). La fila 0 es un
 * marcador "Elegí…": mientras quede ahí, `value` es null.
 */
export default function WheelPicker({
  items,
  value,
  onChange,
  placeholder = "Elegí…",
  label,
}: {
  items: string[];
  value: number | null;
  onChange: (index: number | null) => void;
  placeholder?: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rows = [placeholder, ...items];
  const [centered, setCentered] = useState(value === null ? 0 : value + 1);

  // Posición inicial (y si el valor cambia desde afuera)
  useEffect(() => {
    const target = value === null ? 0 : value + 1;
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ROW) !== target) el.scrollTop = target * ROW;
    setCentered(target);
  }, [value]);

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    const index = Math.min(rows.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
    setCentered(index);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const next = index === 0 ? null : index - 1;
      if (next !== value) onChange(next);
    }, 90);
  };

  const scrollToRow = (index: number) =>
    ref.current?.scrollTo({ top: index * ROW, behavior: "smooth" });

  const move = (delta: number) =>
    scrollToRow(Math.min(rows.length - 1, Math.max(0, centered + delta)));

  return (
    <div
      className="wheel-picker"
      style={{ height: ROW * VISIBLE }}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
        if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      }}
    >
      <div className="wheel-highlight" style={{ top: ROW * 2, height: ROW }} aria-hidden="true" />
      <div ref={ref} className="wheel-scroll" onScroll={handleScroll}>
        <div style={{ height: ROW * 2 }} aria-hidden="true" />
        {rows.map((text, i) => {
          const distance = Math.abs(i - centered);
          return (
            <div
              key={`${i}-${text}`}
              role="option"
              aria-selected={i === centered}
              onClick={() => scrollToRow(i)}
              className={`wheel-row ${i === 0 ? "wheel-placeholder" : ""}`}
              style={{
                height: ROW,
                opacity: distance === 0 ? 1 : distance === 1 ? 0.55 : 0.25,
                transform: `scale(${distance === 0 ? 1 : 0.92})`,
              }}
            >
              {text}
            </div>
          );
        })}
        <div style={{ height: ROW * 2 }} aria-hidden="true" />
      </div>
    </div>
  );
}
