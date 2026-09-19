"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { IconX, IconTrendingUp, IconTrendingDown, IconMinus, IconLoader2, IconChartBar } from "@tabler/icons-react";

export type ComparisonType = 'yesterday' | 'last_week' | 'last_month';

interface SalesComparisonPanelProps {
    comparisonType: ComparisonType;
    onClose: () => void;
}

function getDateRanges(type: ComparisonType) {
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    let compareDate: Date;
    let label: string;

    if (type === 'yesterday') {
        compareDate = new Date(now);
        compareDate.setDate(compareDate.getDate() - 1);
        label = 'Ayer';
    } else if (type === 'last_week') {
        compareDate = new Date(now);
        compareDate.setDate(compareDate.getDate() - 7);
        label = 'Misma semana anterior';
    } else {
        compareDate = new Date(now);
        compareDate.setMonth(compareDate.getMonth() - 1);
        label = 'Mismo día del mes anterior';
    }

    const compareStart = new Date(compareDate);
    compareStart.setHours(0, 0, 0, 0);

    const compareEnd = new Date(compareDate);
    compareEnd.setHours(23, 59, 59, 999);

    return {
        todayStart: todayStart.toISOString(),
        todayEnd: todayEnd.toISOString(),
        compareStart: compareStart.toISOString(),
        compareEnd: compareEnd.toISOString(),
        label,
    };
}

const TITLES: Record<ComparisonType, string> = {
    yesterday: 'Comparativa: Día Anterior',
    last_week: 'Comparativa: Misma Semana',
    last_month: 'Comparativa: Mismo Día del Mes',
};

export function SalesComparisonPanel({ comparisonType, onClose }: SalesComparisonPanelProps) {
    const [loading, setLoading] = useState(true);
    const [todayTotal, setTodayTotal] = useState(0);
    const [compareTotal, setCompareTotal] = useState(0);
    const [label, setLabel] = useState('');

    const supabase = createClient();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const ranges = getDateRanges(comparisonType);
            setLabel(ranges.label);

            const [todayResult, compareResult] = await Promise.all([
                supabase
                    .from('orders')
                    .select('total')
                    .gte('created_at', ranges.todayStart)
                    .lte('created_at', ranges.todayEnd),
                supabase
                    .from('orders')
                    .select('total')
                    .gte('created_at', ranges.compareStart)
                    .lte('created_at', ranges.compareEnd),
            ]);

            const todaySum = (todayResult.data || []).reduce(
                (sum, o) => sum + parseFloat(o.total),
                0
            );
            const compareSum = (compareResult.data || []).reduce(
                (sum, o) => sum + parseFloat(o.total),
                0
            );

            setTodayTotal(todaySum);
            setCompareTotal(compareSum);
            setLoading(false);
        };

        fetchData();

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [comparisonType]);

    const diff = todayTotal - compareTotal;
    const pct = compareTotal > 0 ? (diff / compareTotal) * 100 : null;
    const isUp = diff > 0;
    const isFlat = diff === 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.92, opacity: 0, y: 24 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.92, opacity: 0, y: 24 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                    >
                        <IconX size={18} />
                    </button>

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-[#FFD60A]">
                            <IconChartBar size={22} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                Análisis Rápido
                            </p>
                            <h3 className="text-xl font-black text-gray-900">{TITLES[comparisonType]}</h3>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <IconLoader2 className="animate-spin text-gray-300" size={48} />
                        </div>
                    ) : (
                        <>
                            {/* Today vs Comparison */}
                            <div className="grid grid-cols-2 gap-4 mb-5">
                                <div className="bg-black rounded-[2rem] p-7 text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">
                                        Hoy
                                    </p>
                                    <p className="text-4xl font-black text-[#FFD60A]">
                                        ${todayTotal.toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-[2rem] p-7 text-center border border-gray-100">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                                        {label}
                                    </p>
                                    <p className="text-4xl font-black text-gray-900">
                                        ${compareTotal.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Difference row */}
                            <div
                                className={`rounded-[2rem] p-6 flex items-center justify-between ${
                                    isFlat
                                        ? 'bg-gray-50'
                                        : isUp
                                        ? 'bg-green-50'
                                        : 'bg-red-50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    {isFlat ? (
                                        <IconMinus size={24} className="text-gray-400" />
                                    ) : isUp ? (
                                        <IconTrendingUp size={24} className="text-green-600" />
                                    ) : (
                                        <IconTrendingDown size={24} className="text-red-500" />
                                    )}
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            Diferencia
                                        </p>
                                        <p
                                            className={`text-2xl font-black ${
                                                isFlat
                                                    ? 'text-gray-500'
                                                    : isUp
                                                    ? 'text-green-600'
                                                    : 'text-red-500'
                                            }`}
                                        >
                                            {isUp ? '+' : ''}${diff.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                {pct !== null && (
                                    <div
                                        className={`text-4xl font-black ${
                                            isFlat
                                                ? 'text-gray-300'
                                                : isUp
                                                ? 'text-green-500'
                                                : 'text-red-400'
                                        }`}
                                    >
                                        {isUp ? '+' : ''}{pct.toFixed(1)}%
                                    </div>
                                )}
                            </div>

                            <p className="text-center text-xs text-gray-400 font-medium mt-5">
                                Presioná ESC para cerrar
                            </p>
                        </>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
