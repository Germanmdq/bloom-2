/** Variantes sin JavaScript de componentes base, para páginas de servidor. */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DemoTag({ className }: { className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold leading-5 text-amber-800", className)}>Ejemplo</span>;
}

export function EmptyStateStatic({ icon, title, text }: { icon: ReactNode; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-black/10 bg-white/60 px-6 py-12 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-vet-tint text-vet-primary">{icon}</div>
      <h3 className="font-vet-display text-lg font-bold text-vet-ink">{title}</h3>
      {text && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-neutral-600">{text}</p>}
    </div>
  );
}
