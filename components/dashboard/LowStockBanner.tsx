"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { IconAlertTriangle, IconChevronRight, IconX } from "@tabler/icons-react";

interface LowStockItem {
    id: string;
    name: string;
    stock: number;
    min_stock: number;
    type: "product" | "insumo";
}

export function LowStockBanner() {
    const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
    const [dismissed, setDismissed] = useState(false);
    const supabase = createClient();

    const fetchLowStock = async () => {
        try {
            // 1. Productos con track_stock
            const { data: prods } = await supabase
                .from("products")
                .select("id, name, stock, min_stock, track_stock")
                .eq("track_stock", true);

            const lowProds: LowStockItem[] = (prods || [])
                .filter((p: any) => Number(p.stock) <= Number(p.min_stock || 0))
                .map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    stock: Number(p.stock) || 0,
                    min_stock: Number(p.min_stock) || 0,
                    type: "product" as const,
                }));

            // 2. Insumos con stock_minimo
            const { data: insumos } = await supabase
                .from("insumos")
                .select("id, nombre, stock_actual, stock_minimo, activo")
                .eq("activo", true);

            const lowInsumos: LowStockItem[] = (insumos || [])
                .filter((i: any) => Number(i.stock_actual) <= Number(i.stock_minimo || 0))
                .map((i: any) => ({
                    id: i.id,
                    name: i.nombre,
                    stock: Number(i.stock_actual) || 0,
                    min_stock: Number(i.stock_minimo) || 0,
                    type: "insumo" as const,
                }));

            setLowStockItems([...lowProds, ...lowInsumos]);
        } catch (err) {
            console.warn("Error fetching low stock:", err);
        }
    };

    useEffect(() => {
        fetchLowStock();

        // Realtime subscription for product stock changes
        const channel = supabase
            .channel("low_stock_watch")
            .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
                fetchLowStock();
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "insumos" }, () => {
                fetchLowStock();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (dismissed || lowStockItems.length === 0) return null;

    const previewNames = lowStockItems.slice(0, 3).map(i => i.name).join(", ");
    const remainingCount = lowStockItems.length - 3;

    return (
        <div className="mb-6 bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                    <IconAlertTriangle size={20} />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-black text-amber-900 text-sm uppercase tracking-wide">
                            Atención: {lowStockItems.length} {lowStockItems.length === 1 ? 'ítem en stock crítico' : 'ítems en stock crítico'}
                        </span>
                    </div>
                    <p className="text-xs text-amber-800 font-medium mt-0.5">
                        {previewNames} {remainingCount > 0 && `(+${remainingCount} más)`}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
                <Link
                    href="/dashboard/compras-y-stock"
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-sm transition-all"
                >
                    Reponer <IconChevronRight size={14} />
                </Link>
                <button
                    onClick={() => setDismissed(true)}
                    className="p-1.5 text-amber-700 hover:text-amber-900 rounded-lg hover:bg-amber-200/50 transition-colors"
                    title="Cerrar aviso"
                >
                    <IconX size={16} />
                </button>
            </div>
        </div>
    );
}
