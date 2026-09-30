"use client";
import { useSettings } from "@/lib/vet/client/store";
import { cn } from "@/lib/utils";

/**
 * Logo del negocio. Si en la configuración hay un logo propio (PNG/WebP/SVG)
 * distinto del provisorio, se muestra tal cual; si no, isotipo + nombre.
 */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  const { business } = useSettings();
  const custom = business.logo && !business.logo.endsWith("/brand/logo.svg");
  if (custom) {
    return <img src={business.logo} alt={business.logoAlt} className={cn("h-11 w-auto", className)} width={160} height={44} />;
  }
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img src="/veterinaria/brand/mark.svg" alt="" width={40} height={40} className="size-10 drop-shadow-sm" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-vet-display text-[21px] font-extrabold italic tracking-[-0.01em] text-vet-primary">{business.name.split(" ")[0]}</span>
          <span className="mt-0.5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-vet-ink">{business.name.split(" ").slice(1).join(" ")}</span>
        </span>
      )}
      <span className="sr-only">{business.name}</span>
    </span>
  );
}
