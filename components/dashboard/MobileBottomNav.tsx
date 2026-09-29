"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutGrid, IconListCheck, IconSettings, IconCalendar, IconDots } from "@tabler/icons-react";

const mainLinks = [
    { href: "/dashboard/tables",       label: "Mesas",    icon: IconLayoutGrid },
    { href: "/dashboard/reservations", label: "Reservas", icon: IconCalendar },
    { href: "/dashboard/orders",       label: "Historial", icon: IconListCheck },
    { href: "/dashboard/settings",     label: "Ajustes",  icon: IconSettings },
];

interface MobileBottomNavProps {
    onMoreClick: () => void;
}

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
    const pathname = usePathname();

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-100 safe-area-pb">
            <div className="flex items-stretch h-16">
                {mainLinks.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname.startsWith(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                                isActive ? "text-black" : "text-gray-400"
                            }`}
                        >
                            <div className={`p-1.5 rounded-xl transition-colors ${isActive ? "bg-[#FFD60A]" : ""}`}>
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                            </div>
                            <span className={`text-[10px] font-bold ${isActive ? "text-black" : "text-gray-400"}`}>
                                {label}
                            </span>
                        </Link>
                    );
                })}

                {/* Más */}
                <button
                    onClick={onMoreClick}
                    className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400"
                >
                    <div className="p-1.5 rounded-xl">
                        <IconDots size={20} strokeWidth={1.8} />
                    </div>
                    <span className="text-[10px] font-bold">Más</span>
                </button>
            </div>
        </nav>
    );
}
