"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Table, TableStatus } from "@/lib/types";
import { OrderSheet } from "@/components/dashboard/OrderSheet";
import { createClient } from "@/lib/supabase/client";
import { IconLoader2, IconX, IconTruck, IconShoppingBag, IconClock } from "@tabler/icons-react";
import { useEscape } from "@/lib/hooks/useEscape";

type WebOrder = {
    id: string;
    customer_name: string;
    customer_phone: string;
    delivery_type?: string;
    delivery_info?: string;
    items: any[];
    total: number;
    status: string;
    created_at: string;
    order_type?: string;
    table_id?: number;
};



export default function TablesPage() {
    const [tables, setTables] = useState<Table[]>([]);
    const [tableSearch, setTableSearch] = useState("");
    const [globalSearchClients, setGlobalSearchClients] = useState<any[]>([]);
    const [globalSearchProveedores, setGlobalSearchProveedores] = useState<any[]>([]);
    const [globalSearchProducts, setGlobalSearchProducts] = useState<any[]>([]);
    const [isGlobalSearching, setIsGlobalSearching] = useState(false);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [isQuickPayOpen, setIsQuickPayOpen] = useState(false);
    const [quickPayInput, setQuickPayInput] = useState("");
    const [autoOpenPayment, setAutoOpenPayment] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Web orders state
    const [webOrders, setWebOrders] = useState<WebOrder[]>([]);
    const [selectedWebOrder, setSelectedWebOrder] = useState<WebOrder | null>(null);
    const [mounted, setMounted] = useState(false);

    // New Table Modal State
    const [isNewTableModalOpen, setIsNewTableModalOpen] = useState(false);
    const [newTableType, setNewTableType] = useState<'LOCAL' | 'DELIVERY' | 'TAKEAWAY'>('LOCAL');
    const [newTableIdInput, setNewTableIdInput] = useState("");
    const [newTableName, setNewTableName] = useState("");
    const [newTableCustomerId, setNewTableCustomerId] = useState<string | null>(null);
    const [newTableCustomerBalance, setNewTableCustomerBalance] = useState<number | null>(null);
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerResults, setCustomerResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showRegisterNew, setShowRegisterNew] = useState(false);
    const [newCustomerPhone, setNewCustomerPhone] = useState("");
    const [isRegisteringCustomer, setIsRegisteringCustomer] = useState(false);

    const supabase = createClient();

    const searchCustomers = async (q: string) => {
        setCustomerSearch(q);
        setShowRegisterNew(false);
        if (q.length < 2) {
            setCustomerResults([]);
            return;
        }
        setIsSearching(true);
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, phone, balance')
            .ilike('full_name', `%${q}%`)
            .limit(5);
        setCustomerResults(data || []);
        setIsSearching(false);
        // Si no hay resultados, ofrecemos registrar
        if (!data || data.length === 0) {
            setShowRegisterNew(true);
        }
    };

    const handleRegisterNewCustomer = async () => {
        if (!customerSearch.trim()) return;

        // Si no hay teléfono, simplemente usamos el nombre como alias de mesa sin crear perfil
        if (!newCustomerPhone.trim()) {
            setNewTableName(customerSearch.trim());
            setCustomerSearch("");
            setCustomerResults([]);
            setShowRegisterNew(false);
            return;
        }

        setIsRegisteringCustomer(true);
        try {
            const res = await fetch('/api/auth/register-phone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: customerSearch.trim(), phone: newCustomerPhone.trim(), birthdate: null }),
            });
            const json = await res.json() as { id?: string; customer_number?: string; name?: string; error?: string };

            if (!res.ok) {
                if (json.error === 'already_exists') {
                    // Cliente ya existe — buscarlo por teléfono (formato limpio o con formato)
                    const phoneClean = newCustomerPhone.replace(/\D/g, '');
                    let existing: { id: string; full_name: string } | null = null;
                    const { data: byRaw } = await supabase.from('profiles').select('id, full_name').eq('phone', newCustomerPhone.trim()).maybeSingle();
                    if (byRaw) {
                        existing = byRaw;
                    } else {
                        const { data: byClean } = await supabase.from('profiles').select('id, full_name').eq('phone', phoneClean).maybeSingle();
                        existing = byClean;
                    }
                    if (existing) {
                        setNewTableCustomerId(existing.id);
                        setNewTableName(existing.full_name);
                    } else {
                        setNewTableName(customerSearch.trim());
                    }
                } else {
                    alert('Error al registrar cliente: ' + (json.error ?? 'Error desconocido'));
                    return;
                }
            } else {
                // Usar el ID devuelto por la API directamente
                if (json.id) {
                    setNewTableCustomerId(json.id);
                    setNewTableName(json.name ?? customerSearch.trim());
                } else {
                    setNewTableName(customerSearch.trim());
                }
            }

            setCustomerSearch("");
            setCustomerResults([]);
            setShowRegisterNew(false);
            setNewCustomerPhone("");
        } catch (err: any) {
            alert('Error al registrar cliente: ' + err.message);
        } finally {
            setIsRegisteringCustomer(false);
        }
    };

    useEffect(() => {
        const q = tableSearch.trim();
        if (q.length < 2) {
            setGlobalSearchClients([]);
            setGlobalSearchProveedores([]);
            setGlobalSearchProducts([]);
            setIsGlobalSearching(false);
            return;
        }
        const timer = setTimeout(async () => {
            setIsGlobalSearching(true);
            try {
                const [{ data: clients }, { data: proveedores }, { data: products }] = await Promise.all([
                    supabase.from('profiles').select('id, full_name, phone, balance').ilike('full_name', `%${q}%`).limit(5),
                    supabase.from('proveedores').select('id, nombre, telefono, saldo_cc').ilike('nombre', `%${q}%`).limit(5),
                    supabase.from('products').select('id, name, price, image_url').ilike('name', `%${q}%`).limit(5)
                ]);
                setGlobalSearchClients(clients || []);
                setGlobalSearchProveedores(proveedores || []);
                setGlobalSearchProducts(products || []);
            } catch (err) {
                console.error("Error searching global:", err);
            } finally {
                setIsGlobalSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [tableSearch]);

    useEffect(() => {
        setMounted(true);
        fetchTables();
        fetchWebOrders();
        
        // Listen to salon_tables changes (POS tables)
        const tableChannel = supabase
            .channel('salon_tables_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'salon_tables' }, (payload) => {
                fetchTables();
                if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                    const row = payload.new as Table;
                    if (row && row.status === 'OCCUPIED' && row.items && row.items.length > 0) {
                        // REVERTIDO: No hacer auto-pop de la mesa. El usuario prefiere clickearla manualmente.
                        // Solo actualizamos el state de las mesas (arriba en fetchTables).
                    }
                }
            })
            .subscribe();

        // Listen to orders changes (web orders & salon tables)
        const ordersChannel = supabase
            .channel('orders_realtime_tables')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchTables();
                fetchWebOrders();
            })
            .subscribe();

        // Listener para refrescar desde la notificación "Ir a gestionar"
        const handleRefreshEvent = () => {
            fetchTables();
            fetchWebOrders();
        };
        window.addEventListener('bloom-refresh-tables', handleRefreshEvent);

        return () => {
            supabase.removeChannel(tableChannel);
            supabase.removeChannel(ordersChannel);
            window.removeEventListener('bloom-refresh-tables', handleRefreshEvent);
        };
    }, []);
    
    // Listener para el evento global de Escape
    useEscape(() => {
        if (isNewTableModalOpen) setIsNewTableModalOpen(false);
        if (selectedWebOrder) {
            setSelectedWebOrder(null);
            fetchWebOrders();
        }
        if (isQuickPayOpen) setIsQuickPayOpen(false);
        if (selectedTable) setSelectedTable(null);
        setTableSearch("");
    });

    // IconKeyboard Shortcuts (F1, F5, +, Esc)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {

            // F1 enfoca el buscador
            if (e.key === 'F1') {
                e.preventDefault();
                document.getElementById('table-search')?.focus();
            }
            // F5 Cobro Rápido
            if (e.key === 'F5') {
                e.preventDefault();
                if (!selectedTable) {
                    setIsQuickPayOpen(true);
                    setQuickPayInput("");
                }
            }
            // El signo "+" abre la mesa (si no hay modales abiertos)
            if (e.key === '+' && !isNewTableModalOpen && !selectedTable && !isQuickPayOpen) {
                e.preventDefault();
                setIsNewTableModalOpen(true);
            }

            // Shortcuts dentro de "Nueva Mesa" (1: Local, 2: Delivery, 3: Retiro)
            if (isNewTableModalOpen) {
                const target = e.target as HTMLElement;
                if (target.tagName !== 'INPUT' || (target as HTMLInputElement).value === "") {
                    if (e.key === '1') { e.preventDefault(); setNewTableType('LOCAL'); }
                    if (e.key === '2') { e.preventDefault(); setNewTableType('DELIVERY'); }
                    if (e.key === '3') { e.preventDefault(); setNewTableType('TAKEAWAY'); }
                }
            }

        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isNewTableModalOpen, selectedTable, selectedWebOrder, isQuickPayOpen]);

    async function fetchWebOrders() {
        try {
            // Usamos una selección más segura para evitar el error 400

            const { data, error } = await supabase
                .from('orders')
                .select('id, table_id, status, total, items, created_at, customer_name, customer_phone, customer_id, order_type, delivery_type, delivery_info, paid, payment_method')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(50);

            if (error) {
                console.error('[TablesPage] Error Fatal 400:', error.message);
                // Si falla, intentamos una carga mínima absoluta
                const { data: minData } = await supabase.from('orders').select('id, total').limit(10);
                if (minData) console.log('Carga mínima exitosa, el problema es una columna específica.');
                return;
            }
            
            // Filtramos por order_type en el cliente si es necesario para evitar el error 400 en el backend
            if (data) {
                const webOnly = data.filter((o: any) => !o.table_id || o.order_type === 'web');
                setWebOrders(webOnly as WebOrder[]);
            }
        } catch (err: any) {
            console.error('[TablesPage] fetchWebOrders catch:', err.message);
        }
    }

    async function fetchTables() {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('salon_tables')
                .select('*')
                .eq('status', 'OCCUPIED')
                .order('id', { ascending: true });

            if (error) {
                console.error('[TablesPage] fetchTables error:', error.message);
                setError(error.message);
            } else if (data) {
                setTables(data as Table[]);
            }
        } catch (err: any) {
            setError(err.message || 'Error inesperado');
        } finally {
            setLoading(false);
        }
    }

    const handleOrderComplete = () => {
        fetchTables();
    };

    const handleOpenTable = async (id?: number) => {
        let targetId = id || 0;
        const finalOrderType = newTableType;

        if (!id) {
            const parsed = parseInt(newTableIdInput);
            if (!isNaN(parsed)) {
                targetId = parsed;
            } else if (newTableName || newTableCustomerId) {
                // SI NO HAY NÚMERO PERO SÍ NOMBRE, ASIGNAMOS UN ID VIRTUAL
                // Buscamos el ID virtual más alto ocupado actualmente (>= 301)
                const virtualTables = tables.filter(t => t.id >= 301).sort((a, b) => b.id - a.id);
                const nextVirtualId = virtualTables.length > 0 ? virtualTables[0].id + 1 : 301;
                targetId = nextVirtualId;
            } else if (newTableType === 'LOCAL') {
                alert("Por favor ingresa un número de mesa o un nombre/alias.");
                return;
            } else if (newTableType === 'DELIVERY') {
                const freeDeliveryTables = tables
                    .filter(t => t.id >= 100 && t.id < 200 && t.status === 'FREE')
                    .sort((a, b) => a.id - b.id);
                targetId = freeDeliveryTables.length > 0 ? freeDeliveryTables[0].id : (tables.filter(t => t.id >= 100 && t.id < 200).sort((a, b) => b.id - a.id)[0]?.id || 100) + 1;
            } else if (newTableType === 'TAKEAWAY') {
                const freeTakeawayTables = tables
                    .filter(t => t.id >= 200 && t.id < 300 && t.status === 'FREE')
                    .sort((a, b) => a.id - b.id);
                targetId = freeTakeawayTables.length > 0 ? freeTakeawayTables[0].id : (tables.filter(t => t.id >= 200 && t.id < 300).sort((a, b) => b.id - a.id)[0]?.id || 200) + 1;
            }
        }

        if (targetId === 0) {
            alert("No se pudo determinar un ID de mesa válido.");
            return;
        }

        // Si la mesa ya está ocupada, simplemente la seleccionamos
        const existing = tables.find(t => t.id === targetId);
        if (existing && existing.status === 'OCCUPIED') {
            setSelectedTable(existing);
            setIsNewTableModalOpen(false);
            setNewTableIdInput("");
            return;
        }

        // Si hay nombre pero no ID, intentar resolverlo por nombre exacto en profiles
        let resolvedCustomerId = newTableCustomerId;
        if (!resolvedCustomerId && newTableName.trim()) {
            const { data: found } = await supabase
                .from('profiles')
                .select('id')
                .ilike('full_name', newTableName.trim())
                .limit(2);
            if (found?.length === 1) resolvedCustomerId = found[0].id;
        }

        const { data, error } = await supabase
            .from('salon_tables')
            .upsert({
                id: targetId,
                status: 'OCCUPIED',
                order_type: finalOrderType,
                items: (newTableName || resolvedCustomerId) ? [{
                    id: 'meta-customer',
                    name: `Cliente: ${newTableName || 'Alias'}`,
                    customer_id: resolvedCustomerId,
                    price: 0,
                    quantity: 1,
                    category: 'METADATA'
                }] : [],
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error("Error opening table:", error);
            alert("Hubo un error al abrir la mesa: " + error.message);
        } else {
            setIsNewTableModalOpen(false);
            setNewTableIdInput("");
            setNewTableName("");
            setNewTableCustomerId(null);
            setNewTableCustomerBalance(null);
            setCustomerSearch("");
            if (data) {
                setTables(prev => {
                    const filtered = prev.filter(t => t.id !== (data as Table).id);
                    return [...filtered, data as Table].sort((a, b) => a.id - b.id);
                });
                setSelectedTable(data as Table);
            }
            fetchTables();
        }
    };

    const handleQuickPayConfirm = () => {
        if (!quickPayInput) return;
        const search = quickPayInput.toLowerCase();
        
        // Buscar mesa ocupada que coincida con el ID o el Nombre
        const target = tables.find(t => {
            if (t.status !== 'OCCUPIED') return false;
            const metaCust = t.items?.find((i: any) => i.id === 'meta-customer');
            const name = metaCust?.name?.toLowerCase() || "";
            return t.id.toString() === search || name.includes(search);
        });

        if (target) {
            setAutoOpenPayment(true);
            setSelectedTable(target);
            setIsQuickPayOpen(false);
            setQuickPayInput("");
        } else {
            alert("No se encontró una mesa ocupada con ese nombre o número.");
        }
    };

    const handleQuickOpen = (val: string) => {
        const num = parseInt(val);
        if (isNaN(num)) return;
        
        // Determinar tipo según rango
        if (num >= 1 && num < 100) setNewTableType('LOCAL');
        else if (num >= 100 && num < 200) setNewTableType('DELIVERY');
        else if (num >= 200 && num < 300) setNewTableType('TAKEAWAY');

        handleOpenTable(num);
    };

    const activeTablesCount = tables.filter(t => t.status === 'OCCUPIED').length;
    const totalActiveCount = activeTablesCount + webOrders.length;

    const sortedTables = [...tables]
        .filter(t => t.status === 'OCCUPIED')
        .sort((a, b) => a.id - b.id);
        
    const filteredSortedTables = sortedTables.filter(t => {
        if (!tableSearch.trim()) return true;
        const q = tableSearch.toLowerCase();
        const idStr = String(t.id);
        const metaCust = t.items?.find((i: any) => i.id === 'meta-customer');
        const name = metaCust?.name?.toLowerCase() || "";
        const orderLabel = t.order_type === 'DELIVERY' ? 'delivery' : t.order_type === 'TAKEAWAY' ? 'retiro' : 'salón';
        return idStr.includes(q) || name.includes(q) || orderLabel.includes(q);
    });

    const filteredWebOrders = webOrders.filter(o => {
        if (!tableSearch.trim()) return true;
        const q = tableSearch.toLowerCase();
        const idStr = String(o.id);
        const name = o.customer_name?.toLowerCase() || "";
        const orderLabel = 'web';
        return idStr.includes(q) || name.includes(q) || orderLabel.includes(q);
    });
    

    const getCardStyles = (table: Table) => {
        // Mesa libre en el salón
        if (table.status === 'FREE') {
            return {
                bg: 'bg-white hover:bg-amber-50/40 border-2 border-dashed border-gray-200 hover:border-amber-400 shadow-sm transition-all',
                dot: 'bg-gray-300',
                badgeBg: 'bg-gray-100 text-gray-500',
                label: 'Libre',
                textColor: 'text-gray-800',
                subTextColor: 'text-gray-400',
            };
        }

        // 1. Check order_type first (Most reliable)
        if (table.order_type === 'DELIVERY') {
            return {
                bg: 'bg-red-500 shadow-[0_22px_70px_rgba(0,0,0,0.18)]',
                dot: 'bg-white/40 shadow-sm',
                badgeBg: 'bg-white/20 text-white',
                label: 'Delivery',
                textColor: 'text-white',
                subTextColor: 'text-red-100/70',
            };
        }
        if (table.order_type === 'TAKEAWAY') {
            return {
                bg: 'bg-emerald-500 shadow-[0_22px_70px_rgba(0,0,0,0.18)]',
                dot: 'bg-white/40 shadow-sm',
                badgeBg: 'bg-white/20 text-white',
                label: 'Retiro',
                textColor: 'text-white',
                subTextColor: 'text-emerald-100/70',
            };
        }

        // 2. Fallback to ID ranges if order_type is not set
        if (table.id >= 51 && table.id <= 100) {
            return {
                bg: 'bg-red-500 shadow-[0_22px_70px_rgba(0,0,0,0.18)]',
                dot: 'bg-white/40 shadow-sm',
                badgeBg: 'bg-white/20 text-white',
                label: 'Delivery',
                textColor: 'text-white',
                subTextColor: 'text-red-100/70',
            };
        }
        else if (table.id >= 101 && table.id <= 150) {
            return {
                bg: 'bg-emerald-500 shadow-[0_22px_70px_rgba(0,0,0,0.18)]',
                dot: 'bg-white/40 shadow-sm',
                badgeBg: 'bg-white/20 text-white',
                label: 'Retiro',
                textColor: 'text-white',
                subTextColor: 'text-emerald-100/70',
            };
        }

        // Local (1 - 50 or explicitly LOCAL)
        return {
            bg: 'bg-amber-400 shadow-[0_22px_70px_rgba(0,0,0,0.18)]',
            dot: 'bg-amber-950/20 shadow-sm',
            badgeBg: 'bg-black/10 text-amber-950',
            label: 'Salón',
            textColor: 'text-amber-950',
            subTextColor: 'text-amber-900/60',
        };
    };

    if (!mounted) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <IconLoader2 className="animate-spin text-gray-200" size={64} />
                <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Cargando salón...</p>
            </div>
        );
    }

    return (
        <div className="relative min-h-full">
            {/* OrderSheet Overlay */}
            {selectedTable && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white/40 backdrop-blur-3xl"
                        onClick={() => { setSelectedTable(null); fetchTables(); }}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200, opacity: { duration: 0.2 } }}
                        className="relative z-10 w-full h-full flex flex-col p-4 md:p-10"
                    >
                        <div className="bg-white/90 backdrop-blur-2xl w-full h-full rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] border border-white/50 overflow-hidden flex flex-col">
                            <OrderSheet
                                tableId={selectedTable.id}
                                initialTableData={selectedTable}
                                initialShowPayment={autoOpenPayment}
                                onClose={() => {
                                    setSelectedTable(null);
                                    setAutoOpenPayment(false);
                                    setTimeout(() => fetchTables(), 300);
                                }}
                                onOrderComplete={() => handleOrderComplete()}
                            />
                        </div>
                    </motion.div>
                </div>
            )}

            {/* New Table Modal */}
            {/* Quick Pay Modal (F5) */}
            {isQuickPayOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsQuickPayOpen(false)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-white/20"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                                <span className="text-white font-black text-xl">$</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 leading-tight">Cobro Rápido</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ingrese Mesa o Nombre</p>
                            </div>
                        </div>

                        <input
                            autoFocus
                            type="text"
                            placeholder="Ej: 5 o Germán..."
                            value={quickPayInput}
                            onChange={(e) => setQuickPayInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleQuickPayConfirm(); }}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-black text-lg outline-none focus:ring-2 ring-black/5 mb-6"
                        />

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsQuickPayOpen(false)}
                                className="flex-1 py-4 font-bold text-gray-500 hover:bg-gray-100 rounded-2xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleQuickPayConfirm}
                                className="flex-1 py-4 font-bold text-white bg-black hover:scale-105 active:scale-95 rounded-2xl transition-all shadow-xl"
                            >
                                Seleccionar Mesa
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {isNewTableModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => {
                            setIsNewTableModalOpen(false);
                            setCustomerSearch("");
                            setCustomerResults([]);
                            setShowRegisterNew(false);
                            setNewCustomerPhone("");
                            setNewTableIdInput("");
                            setNewTableName("");
                            setNewTableCustomerId(null);
                            setNewTableCustomerBalance(null);
                        }}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
                    >
                        <h3 className="text-2xl font-bold mb-2 text-gray-900">Abrir Nueva Mesa</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Seleccioná el tipo de pedido</p>

                        {/* PASO 1 — Tipo de pedido */}
                        <div className="space-y-3 mb-6">
                            <label className="flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all hover:border-black/20 has-[:checked]:border-black has-[:checked]:bg-black/5">
                                <input
                                    type="radio" name="tableType" value="LOCAL"
                                    checked={newTableType === 'LOCAL'}
                                    onChange={() => setNewTableType('LOCAL')}
                                    className="w-5 h-5 accent-black"
                                />
                                <span className="font-bold text-gray-800">🍽️ Mesa en Local <span className="text-[10px] text-gray-400 ml-1">(1)</span></span>
                            </label>

                            <label className="flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all hover:border-black/20 has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                                <input
                                    type="radio" name="tableType" value="DELIVERY"
                                    checked={newTableType === 'DELIVERY'}
                                    onChange={() => setNewTableType('DELIVERY')}
                                    className="w-5 h-5 accent-red-500"
                                />
                                <span className="font-bold text-gray-800">🛵 Delivery <span className="text-[10px] text-gray-400 ml-1">(2)</span></span>
                            </label>

                            <label className="flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all hover:border-black/20 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                                <input
                                    type="radio" name="tableType" value="TAKEAWAY"
                                    checked={newTableType === 'TAKEAWAY'}
                                    onChange={() => setNewTableType('TAKEAWAY')}
                                    className="w-5 h-5 accent-emerald-600"
                                />
                                <span className="font-bold text-gray-800">🏃 Retiro en Local <span className="text-[10px] text-gray-400 ml-1">(3)</span></span>
                            </label>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-100 mb-6" />

                        {/* PASO 2 — Identificador */}
                        <div className="mb-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                {newTableType === 'LOCAL' ? 'Nº Mesa o Nombre' : 'Nombre del cliente'}
                            </p>
                            {newTableCustomerId ? (
                                /* Cliente ya vinculado */
                                <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="text-sm font-black text-white truncate">✓ {newTableName}</span>
                                        {Number(newTableCustomerBalance) > 0 && (
                                            <span className="shrink-0 text-[10px] font-black text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">
                                                DEUDA: ${Number(newTableCustomerBalance).toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => { setNewTableCustomerId(null); setNewTableCustomerBalance(null); setNewTableName(""); setNewTableIdInput(""); setCustomerSearch(""); setShowRegisterNew(false); }}
                                        className="text-white/40 hover:text-white ml-2 shrink-0"
                                    >
                                        <IconX size={14}/>
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder={
                                            newTableType === 'LOCAL'
                                                ? "Ej: 5, Barra, Germán..."
                                                : "Nombre o buscar cliente..."
                                        }
                                        value={newTableType === 'LOCAL' ? newTableIdInput : customerSearch}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (newTableType === 'LOCAL') {
                                                setNewTableIdInput(val);
                                                if (isNaN(parseInt(val))) setNewTableName(val);
                                                else setNewTableName("");
                                                // también busca cliente para local
                                                searchCustomers(val);
                                            } else {
                                                setCustomerSearch(val);
                                                setNewTableIdInput(val);
                                                setNewTableName(val);
                                                searchCustomers(val);
                                            }
                                        }}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !showRegisterNew) handleOpenTable(); }}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold text-base outline-none focus:border-black focus:ring-2 ring-black/5 transition-all"
                                    />
                                    {isSearching && (
                                        <IconLoader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-gray-300" size={16} />
                                    )}

                                    {/* Resultados de búsqueda */}
                                    {customerResults.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl z-[70] overflow-hidden">
                                            {customerResults.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => {
                                                        setNewTableCustomerId(c.id);
                                                        setNewTableName(c.full_name);
                                                        setNewTableIdInput(c.full_name);
                                                        setNewTableCustomerBalance(c.balance);
                                                        setCustomerResults([]);
                                                        setCustomerSearch("");
                                                        setShowRegisterNew(false);
                                                    }}
                                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500">
                                                            {c.full_name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-800">{c.full_name}</p>
                                                            {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                                                        </div>
                                                    </div>
                                                    {Number(c.balance || 0) > 0 && (
                                                        <div className="shrink-0 ml-2">
                                                            <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-lg border border-red-100">
                                                                DEUDA: ${Number(c.balance).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Registro de nuevo cliente inline */}
                        {showRegisterNew && !newTableCustomerId && (
                            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-4">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                                    ✦ Registrar nuevo cliente
                                </p>
                                <p className="text-sm font-bold text-gray-700 mb-3">
                                    &ldquo;{customerSearch}&rdquo; no está registrado. ¿Querés guardarlo?
                                </p>
                                <input
                                    type="tel"
                                    placeholder="Teléfono (opcional)"
                                    value={newCustomerPhone}
                                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-black mb-3 transition-all"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setNewTableName(customerSearch.trim());
                                            setShowRegisterNew(false);
                                        }}
                                        className="flex-1 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
                                    >
                                        Usar sin registrar
                                    </button>
                                    <button
                                        onClick={handleRegisterNewCustomer}
                                        disabled={isRegisteringCustomer}
                                        className="flex-1 py-2.5 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl transition-all disabled:opacity-50"
                                    >
                                        {isRegisteringCustomer ? 'Guardando...' : newCustomerPhone.trim() ? 'Guardar cliente' : 'Usar como alias'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    setIsNewTableModalOpen(false);
                                    setCustomerSearch("");
                                    setCustomerResults([]);
                                    setShowRegisterNew(false);
                                    setNewCustomerPhone("");
                                    setNewTableIdInput("");
                                    setNewTableName("");
                                    setNewTableCustomerId(null);
                                    setNewTableCustomerBalance(null);
                                }}
                                className="flex-1 py-4 font-bold text-gray-500 hover:bg-gray-100 rounded-2xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleOpenTable()}
                                className="flex-1 py-4 font-bold text-white bg-black hover:scale-105 active:scale-95 rounded-2xl transition-all shadow-xl"
                            >
                                Abrir Mesa
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
                            Bloom <span className="text-gray-300 font-light italic">OS</span>
                        </h1>
                        <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mt-1">Dashboard Actualizado ✓</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input
                                id="table-search"
                                type="text"
                                placeholder="Buscar mesa, cliente o proveedor (F1)..."
                                value={tableSearch}
                                onChange={(e) => setTableSearch(e.target.value)}
                                className="w-64 bg-white border border-gray-200 rounded-xl px-4 py-2 font-bold outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all shadow-sm"
                            />
                            {isGlobalSearching && (
                                <IconLoader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-300" size={16} />
                            )}
                            {(globalSearchClients.length > 0 || globalSearchProveedores.length > 0) && (
                                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-100 rounded-xl shadow-2xl z-[70] overflow-hidden">
                                    {globalSearchClients.length > 0 && (
                                        <div className="p-2 border-b border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-2">Clientes</p>
                                            {globalSearchClients.map(c => (
                                                <button
                                                    key={`client-${c.id}`}
                                                    onClick={() => {
                                                        setTableSearch("");
                                                        setIsNewTableModalOpen(true);
                                                        setNewTableCustomerId(c.id);
                                                        setNewTableName(c.full_name);
                                                        setNewTableCustomerBalance(c.balance);
                                                    }}
                                                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between rounded-lg transition-colors"
                                                >
                                                    <div className="flex-1 min-w-0 pr-2">
                                                        <p className="text-sm font-bold text-gray-800 truncate">{c.full_name}</p>
                                                        {c.phone && <p className="text-xs text-gray-400 truncate">{c.phone}</p>}
                                                    </div>
                                                    {Number(c.balance || 0) > 0 && (
                                                        <span className="shrink-0 text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-lg border border-red-100">
                                                            DEUDA: ${Number(c.balance).toLocaleString()}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {globalSearchProveedores.length > 0 && (
                                        <div className="p-2 border-t border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-2">Proveedores</p>
                                            {globalSearchProveedores.map(p => (
                                                <button
                                                    key={`prov-${p.id}`}
                                                    onClick={() => {
                                                        window.location.href = `/dashboard/compras-y-stock?proveedor=${p.id}`;
                                                    }}
                                                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between rounded-lg transition-colors"
                                                >
                                                    <div className="flex-1 min-w-0 pr-2">
                                                        <p className="text-sm font-bold text-gray-800 truncate">{p.nombre}</p>
                                                        {p.telefono && <p className="text-xs text-gray-400 truncate">{p.telefono}</p>}
                                                    </div>
                                                    {Number(p.saldo_cc || 0) > 0 && (
                                                        <span className="shrink-0 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                                            SALDO: ${Number(p.saldo_cc).toLocaleString()}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {globalSearchProducts.length > 0 && (
                                        <div className="p-2 border-t border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-2">Productos</p>
                                            {globalSearchProducts.map(p => (
                                                <button
                                                    key={`prod-${p.id}`}
                                                    onClick={() => {
                                                        window.location.href = `/dashboard/products?search=${p.name}`;
                                                    }}
                                                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between rounded-lg transition-colors"
                                                >
                                                    <div className="flex-1 min-w-0 pr-2">
                                                        <p className="text-sm font-bold text-gray-800 truncate">{p.name}</p>
                                                        <p className="text-xs text-indigo-600 font-black">${p.price?.toLocaleString()}</p>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-lg bg-gray-50 overflow-hidden shrink-0">
                                                        {p.image_url ? (
                                                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xs">🍔</div>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setIsNewTableModalOpen(true)}
                            className="bg-black text-white px-6 py-2 rounded-xl font-bold uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl"
                        >
                            + Abrir Mesa
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {totalActiveCount > 0 && (
                        <div className="bg-amber-50 border border-amber-200/60 px-3 py-1.5 rounded-xl flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-xs font-black text-amber-900">
                                {totalActiveCount} {totalActiveCount === 1 ? 'Activa' : 'Activas'}
                            </span>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]" /> Salón
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" /> Retiro
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]" /> Delivery
                        </div>
                    </div>
                </div>
            </div>

            {loading && tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <IconLoader2 className="animate-spin text-gray-200" size={64} />
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Sincronizando salón...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-2">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <p className="text-red-500 font-bold uppercase tracking-[0.2em] text-xs">Error de Conexión</p>
                    <p className="text-gray-500 text-sm max-w-md">{error}</p>
                    <button
                        onClick={() => fetchTables()}
                        className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            ) : filteredSortedTables.length === 0 && filteredWebOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                        <span className="text-2xl opacity-50">🍽️</span>
                    </div>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Salón Vacío</p>
                    <p className="text-gray-400 text-sm max-w-md">{tableSearch ? 'No se encontraron resultados para la búsqueda.' : 'No hay mesas abiertas en este momento.'}</p>
                    <button
                        onClick={() => setIsNewTableModalOpen(true)}
                        className="mt-2 px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg"
                    >
                        + Abrir Mesa
                    </button>
                </div>
            ) : (
                <>
                {(() => {
                    const totalItems = filteredWebOrders.length + filteredSortedTables.length;
                    const cols =
                        totalItems <= 6 ? 3 :
                        totalItems <= 8 ? 4 :
                        totalItems <= 12 ? 5 : 6;
                    const gridCols = cols === 3 ? 'grid-cols-3' : cols === 4 ? 'grid-cols-4' : cols === 5 ? 'grid-cols-5' : 'grid-cols-6';

                    const s = cols === 3 ? {
                        minH: 'min-h-[170px]', pad: 'p-5', gap: 'gap-5',
                        name: 'text-2xl', badge: 'text-[9px]', meta: 'text-[10px]',
                        total: 'text-xl', time: 'text-sm', iconSize: 14,
                    } : cols === 4 ? {
                        minH: 'min-h-[155px]', pad: 'p-4', gap: 'gap-4',
                        name: 'text-xl', badge: 'text-[8px]', meta: 'text-[9px]',
                        total: 'text-lg', time: 'text-xs', iconSize: 12,
                    } : cols === 5 ? {
                        minH: 'min-h-[140px]', pad: 'p-4', gap: 'gap-3',
                        name: 'text-lg', badge: 'text-[7px]', meta: 'text-[8px]',
                        total: 'text-base', time: 'text-[10px]', iconSize: 11,
                    } : {
                        minH: 'min-h-[125px]', pad: 'p-3', gap: 'gap-2',
                        name: 'text-base', badge: 'text-[6px]', meta: 'text-[7px]',
                        total: 'text-sm', time: 'text-[9px]', iconSize: 10,
                    };

                    return (
                        <div className={`grid ${gridCols} ${s.gap}`}>
                             {/* Individual Web Order Cards */}
                             {filteredWebOrders.map(order => {
                                 const isDelivery = order.delivery_type === 'delivery' || (!order.delivery_type && order.order_type === 'web');
                                 const now = Date.now();
                                 const createdAt = new Date(order.created_at).getTime();
                                 let minutesElapsed = Math.floor((now - createdAt) / 60000);
                                 if (minutesElapsed < 0) minutesElapsed = 0;
                                 const displayTime = minutesElapsed > 1440 ? '--' : `${minutesElapsed} min`;
                                 const orderLabel = isDelivery ? 'Delivery' : 'Retiro';
                                 const displayName = order.customer_name || 'Pedido Web';
                                 const itemCount = order.items?.length || 0;

                                 return (
                                     <motion.div
                                         key={order.id}
                                         layoutId={`weborder-${order.id}`}
                                         whileHover={{ scale: 1.03 }}
                                         whileTap={{ scale: 0.97 }}
                                         onClick={() => setSelectedWebOrder(order)}
                                         className={`rounded-3xl ${s.pad} flex flex-col justify-between cursor-pointer transition-all duration-300 relative overflow-hidden ${s.minH} ${
                                             isDelivery ? 'bg-red-500 shadow-[0_22px_70px_rgba(0,0,0,0.18)]' : 'bg-emerald-500 shadow-[0_22px_70px_rgba(0,0,0,0.18)]'
                                         }`}
                                     >
                                         {/* Fila superior: chip tipo + tiempo con reloj */}
                                         <div className="flex items-center justify-between w-full">
                                             <span
                                                 title={orderLabel}
                                                 className={`${s.badge} font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full bg-white/20 text-white`}
                                             >
                                                 {orderLabel}
                                             </span>
                                             <span
                                                 title={`${minutesElapsed} minutos activa`}
                                                 className={`flex items-center gap-0.5 ${s.time} ${minutesElapsed >= 60 ? 'font-black' : 'font-semibold'} opacity-80 text-white`}
                                             >
                                                 <IconClock size={s.iconSize} strokeWidth={minutesElapsed >= 60 ? 2.5 : 1.8} />
                                                 {displayTime}
                                             </span>
                                         </div>

                                         {/* Nombre del cliente y dirección — izquierda */}
                                         <div className="flex-1 flex flex-col justify-center min-w-0">
                                             <span className={`${s.name} font-black leading-tight tracking-tight truncate w-full text-white`}>
                                                 {displayName}
                                             </span>
                                             {order.delivery_info && (
                                                 <span className="text-[11px] font-bold text-white/90 truncate mt-0.5 flex items-center gap-1">
                                                     📍 {order.delivery_info}
                                                 </span>
                                             )}
                                             {!order.delivery_info && order.customer_phone && (
                                                 <span className="text-[11px] font-bold text-white/80 truncate mt-0.5 flex items-center gap-1">
                                                     📞 {order.customer_phone}
                                                 </span>
                                             )}
                                         </div>

                                         {/* Divider sutil */}
                                         <div className="w-full h-px mb-1 bg-white/20" />

                                         {/* Fila inferior: items izquierda + total derecha */}
                                         <div className="flex items-center justify-between w-full">
                                             <span className={`${s.meta} font-bold uppercase tracking-widest opacity-60 text-white`}>
                                                 {itemCount > 0 ? `${itemCount} items` : '—'}
                                             </span>
                                             <span className={`${s.total} font-black tracking-tight text-white`}>
                                                 ${Number(order.total || 0).toLocaleString('es-AR')}
                                             </span>
                                         </div>
                                     </motion.div>
                                 );
                             })}

                            {/* POS Tables */}
                            {filteredSortedTables.map(table => {
                                const styles = getCardStyles(table);
                                const isFree = table.status === 'FREE';
                                const now = Date.now();
                                const startTime = table.created_at || table.updated_at;
                                const lastActive = startTime ? new Date(startTime).getTime() : now;
                                let minutesElapsed = Math.floor((now - lastActive) / 60000);
                                if (minutesElapsed < 0) minutesElapsed = 0;
                                const displayTime = minutesElapsed > 1440 ? '--' : `${minutesElapsed} min`;
                                
                                // Determinar nombre o ID para mostrar
                                const metaCust = table.items?.find((i: any) => i.id === 'meta-customer');
                                const hasName = metaCust?.name;
                                const isVirtual = table.id >= 5000 || table.order_type === 'DELIVERY' || table.order_type === 'TAKEAWAY';
                                const isDeliveryTable = table.order_type === 'DELIVERY' || table.id === 5001;
                                const displayName = hasName
                                    ? metaCust.name.replace('Cliente: ', '')
                                    : isVirtual
                                        ? (isDeliveryTable ? 'Delivery' : 'Retiro')
                                        : (isFree ? `Mesa ${table.id}` : String(table.id));
                                const itemCount = (table.items || []).filter((i: any) => i.id !== 'meta-customer').length;
                                const orderLabel = table.order_type === 'DELIVERY' ? 'Delivery' : table.order_type === 'TAKEAWAY' ? 'Retiro' : 'Salón';

                                return (
                                    <motion.div
                                        key={table.id}
                                        layoutId={`table-${table.id}`}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => {
                                            if (isFree) {
                                                handleOpenTable(table.id);
                                            } else {
                                                setSelectedTable(table);
                                            }
                                        }}
                                        className={`rounded-3xl ${s.pad} flex flex-col justify-between cursor-pointer transition-all duration-300 relative overflow-hidden ${s.minH} ${styles.bg}`}
                                    >
                                        {/* Fila superior: chip tipo + tiempo con reloj */}
                                        <div className="flex items-center justify-between w-full">
                                            <span
                                                title={isFree ? 'Libre' : orderLabel}
                                                className={`${s.badge} font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full ${styles.badgeBg}`}
                                            >
                                                {isFree ? 'Libre' : orderLabel}
                                            </span>
                                            {!isFree && (
                                                <span
                                                    title={`${minutesElapsed} minutos activa`}
                                                    className={`flex items-center gap-0.5 ${s.time} ${minutesElapsed >= 60 ? 'font-black' : 'font-semibold'} opacity-80 ${styles.textColor}`}
                                                >
                                                    <IconClock size={s.iconSize} strokeWidth={minutesElapsed >= 60 ? 2.5 : 1.8} />
                                                    {displayTime}
                                                </span>
                                            )}
                                        </div>

                                        {/* Nombre / número — izquierda, truncado */}
                                        <div className="flex-1 flex items-center">
                                            {isVirtual && !hasName ? (
                                                <div className={`opacity-90 ${styles.textColor}`}>
                                                    {isDeliveryTable
                                                        ? <IconTruck size={s.iconSize * 2.8} strokeWidth={1.5} />
                                                        : <IconShoppingBag size={s.iconSize * 2.8} strokeWidth={1.5} />}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className={`${s.name} font-black leading-tight tracking-tight truncate w-full ${styles.textColor}`}>
                                                        {displayName}
                                                    </span>
                                                    {isFree && (
                                                        <span className="text-[11px] font-bold text-amber-600/80 mt-0.5">
                                                            + Abrir comanda
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Divider sutil */}
                                        <div className={`w-full h-px mb-1 ${isFree ? 'bg-gray-100' : (styles.textColor === 'text-white' ? 'bg-white/20' : 'bg-black/10')}`} />

                                        {/* Fila inferior: items izquierda + total derecha */}
                                        <div className="flex items-center justify-between w-full">
                                            <span className={`${s.meta} font-bold uppercase tracking-widest ${isFree ? 'text-gray-400' : 'opacity-60'} ${styles.textColor}`}>
                                                {isFree ? 'Disponible' : (itemCount > 0 ? `${itemCount} items` : '—')}
                                            </span>
                                            <span className={`${s.total} font-black tracking-tight ${isFree ? 'text-gray-300' : styles.textColor}`}>
                                                {isFree ? '$0' : `$${Number(table.total || 0).toLocaleString('es-AR')}`}
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    );
                })()}
                </>
            )}

            {/* Web Order Sheet */}
            {selectedWebOrder && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white/40 backdrop-blur-3xl"
                        onClick={() => { setSelectedWebOrder(null); fetchWebOrders(); }}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200, opacity: { duration: 0.2 } }}
                        className="relative z-10 w-full h-full flex flex-col p-4 md:p-10"
                    >
                        <div className="bg-white/90 backdrop-blur-2xl w-full h-full rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] border border-white/50 overflow-hidden flex flex-col">
                            <OrderSheet
                        tableId={selectedWebOrder.delivery_type === 'delivery' ? 5001 : 5000}
                                webOrderId={selectedWebOrder.id}
                                webOrderData={selectedWebOrder}
                                onClose={() => { setSelectedWebOrder(null); fetchWebOrders(); }}
                                onOrderComplete={() => { setSelectedWebOrder(null); fetchWebOrders(); fetchTables(); }}
                            />
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
