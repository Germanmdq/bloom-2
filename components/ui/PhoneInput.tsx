"use client";

import { useEffect, useRef, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";

const AREA_CODES = [
    { code: "223", city: "Mar del Plata" },
    { code: "11",  city: "Buenos Aires" },
    { code: "221", city: "La Plata" },
    { code: "351", city: "Córdoba" },
    { code: "341", city: "Rosario" },
    { code: "261", city: "Mendoza" },
    { code: "381", city: "Tucumán" },
    { code: "291", city: "Bahía Blanca" },
    { code: "299", city: "Neuquén" },
    { code: "387", city: "Salta" },
    { code: "342", city: "Santa Fe" },
    { code: "376", city: "Posadas" },
    { code: "264", city: "San Juan" },
    { code: "280", city: "Chubut" },
];

interface PhoneInputProps {
    value: string;          // full phone digits, e.g. "2235551234"
    onChange: (value: string) => void;
    error?: boolean;
}

export function PhoneInput({ value, onChange, error = false }: PhoneInputProps) {
    const [areaCode, setAreaCode] = useState("223");
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    // Derive local number from value minus area code
    const localPart = value.replace(/\D/g, "").startsWith(areaCode)
        ? value.replace(/\D/g, "").slice(areaCode.length)
        : value.replace(/\D/g, "").slice(3); // fallback: strip 3-digit prefix

    // Notify parent with combined value whenever area code or local changes
    const emitChange = (area: string, local: string) => {
        onChange(area + local.replace(/\D/g, ""));
    };

    // Initialize parent with area code so it's never empty
    useEffect(() => {
        if (!value) emitChange("223", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Close picker when tapping outside
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent | TouchEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        document.addEventListener("touchstart", handler);
        return () => {
            document.removeEventListener("mousedown", handler);
            document.removeEventListener("touchstart", handler);
        };
    }, [open]);

    const pickArea = (code: string) => {
        setAreaCode(code);
        setOpen(false);
        emitChange(code, localPart);
    };

    const borderClass = error
        ? "border-red-300"
        : "border-neutral-200 focus-within:border-[#c9a84c]";

    return (
        <div ref={wrapRef} className="space-y-2">
            {/* Input row */}
            <div className={`flex rounded-2xl border-2 overflow-visible bg-white transition-all ${borderClass}`}>
                {/* Area code button */}
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o); }}
                    onTouchEnd={(e) => { e.preventDefault(); setOpen(o => !o); }}
                    className="flex items-center gap-1.5 px-4 py-3.5 font-black text-[16px] whitespace-nowrap border-r border-neutral-100 select-none bg-neutral-50 rounded-l-2xl active:bg-neutral-100 min-w-[80px] justify-center"
                    aria-label="Cambiar característica"
                >
                    {areaCode}
                    <IconChevronDown
                        size={13}
                        strokeWidth={3}
                        className={`text-neutral-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    />
                </button>

                {/* Local number */}
                <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-local"
                    placeholder="000-0000"
                    value={localPart}
                    onChange={e => emitChange(areaCode, e.target.value)}
                    className="flex-1 px-4 py-3.5 text-[16px] font-semibold outline-none bg-transparent placeholder:text-neutral-300 rounded-r-2xl"
                />
            </div>

            <p className="text-[12px] font-medium text-neutral-400 ml-1">
                Sin el 15 · Ej: <span className="font-bold">{areaCode} 555-1234</span>
            </p>

            {/* Area code picker */}
            {open && (
                <div className="grid grid-cols-2 gap-1.5 p-3 rounded-2xl border border-neutral-100 bg-white shadow-xl z-50 relative">
                    {AREA_CODES.map(({ code, city }) => (
                        <button
                            key={code}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); pickArea(code); }}
                            onTouchEnd={(e) => { e.preventDefault(); pickArea(code); }}
                            className={`flex justify-between items-center px-3 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                                areaCode === code
                                    ? "bg-neutral-900 text-white"
                                    : "bg-neutral-50 active:bg-neutral-200 text-neutral-700"
                            }`}
                        >
                            <span className="font-black text-[15px]">{code}</span>
                            <span className="text-[11px] font-medium opacity-70">{city}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
