"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconLayoutGrid, IconCoffee, IconListCheck, IconSettings, IconUsers, IconChartPie, IconToolsKitchen, IconPackage, IconMessageCircle, IconBriefcase, IconX, IconLogout, IconHome, IconQrcode} from "@tabler/icons-react";
import { useUserRole } from "@/lib/hooks/use-pos-data";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const links = [
    { href: "/dashboard",          label: "Resumen",   icon: IconLayoutDashboard },
    { href: "/dashboard/tables",   label: "Mesas",     icon: IconLayoutGrid },
    { href: "/dashboard/orders",   label: "Ventas",    icon: IconListCheck },
    { href: "/dashboard/products", label: "Menú",      icon: IconCoffee },
    { href: "/dashboard/compras-y-stock", label: "Compras & Stock", icon: IconPackage },
    { href: "/dashboard/clientes", label: "Clientes",  icon: IconUsers },
    { href: "/dashboard/staff",    label: "Personal",  icon: IconBriefcase },
    { href: "/dashboard/reports",  label: "Reporte Diario", icon: IconChartPie },
    { href: "/dashboard/kitchen",  label: "Cocina",    icon: IconToolsKitchen },
    { href: "/dashboard/whatsapp", label: "WhatsApp",  icon: IconMessageCircle },
    { href: "/dashboard/qr",       label: "QR Mesas",  icon: IconQrcode },
    { href: "/dashboard/settings", label: "Ajustes",   icon: IconSettings },
];

const HIDDEN_SECTIONS = ["Cocina", "WhatsApp"];

interface SidebarProps {
    open: boolean;
    onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: role = 'WAITER' } = useUserRole();
    const supabase = createClient();

    async function handleSignOut() {
        await supabase.auth.signOut();
        router.push("/auth");
    }

    const filteredLinks = links.filter(link => {
        if (HIDDEN_SECTIONS.includes(link.label)) return false;
        
        // Administrador ve todo (menos las secciones ocultas)
        if (role === 'ADMIN') return true;

        // Mozo y Cocinero solo ven "Mesas" (carga de mesas y cobrar)
        if (link.label === "Mesas") return true;

        return false;
    });

    return (
        <>
            {/* Overlay en mobile */}
            {open && (
                <div
                    className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed md:relative z-40 top-0 left-0 h-full
                w-72 flex min-h-0 flex-col bg-white border-r border-gray-200
                transition-transform duration-300 ease-in-out
                ${open ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 md:w-80
            `}>
                <div className="mb-5 shrink-0 px-5 pt-5 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#2d4a3e] text-sm font-black text-white">B</div>
                        <div>
                            <h1 className="text-sm font-bold tracking-tight text-gray-900">Bloom OS</h1>
                            <span className="text-xs text-gray-500">Gestión del local</span>
                        </div>
                    </div>
                    {/* Botón cerrar solo en mobile */}
                    <button
                        onClick={onClose}
                        className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        <IconX size={18} />
                    </button>
                </div>

                <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
                    <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Operación</p>
                    {filteredLinks.map((link) => {
                        const isActive = link.href === "/dashboard"
                            ? pathname === link.href
                            : pathname.startsWith(link.href);
                        const Icon = link.icon;
                        return (
                            <Link key={link.href} href={link.href} onClick={onClose}>
                                <div className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${isActive
                                    ? "bg-[#eef4f0] text-[#2d4a3e] font-semibold"
                                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                }`}>
                                    <Icon size={18} className={isActive ? "text-[#2d4a3e]" : "opacity-75"} />
                                    <span>{link.label}</span>
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-4 shrink-0 border-t border-gray-200 pt-4 px-4 pb-4 space-y-3">
                    <Link href="/" onClick={onClose} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"><IconHome size={18} /> Ver sitio público</Link>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200 text-sm font-medium"
                    >
                        <IconLogout size={18} />
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </div>
        </>
    );
}
// Cache bust: Mon Apr 27 14:39:17 -03 2026
