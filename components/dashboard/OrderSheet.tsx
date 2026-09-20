"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
    IconSearch, IconTrash, IconCreditCard, IconCheck, IconLoader2, IconX, 
    IconChevronLeft, IconPrinter, IconToolsKitchen2, IconStar,
    IconSoup, IconMeat, IconPizza, IconCup, IconIceCream, IconGlassFull,
    IconBeer, IconCake, IconBread, IconCookie, IconCheese, IconFish, 
    IconCarrot, IconBottle, IconCoffee, IconGlass, IconSalad, IconBurger,
} from "@tabler/icons-react";
import { useEscape } from "@/lib/hooks/useEscape";
import { motion, AnimatePresence } from "framer-motion";
import { useOrderStore } from "@/lib/store/order-store";
import { useQueryClient } from "@tanstack/react-query";
import { useProducts, useCategories, useCreateOrder, useSendKitchenTicket, useAppSettings } from "@/lib/hooks/use-pos-data";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { orderSheetHeaderBorderClass } from "@/lib/dashboard/table-colors";
import { orderMatchesWebVirtualTable, WEB_ORDER_TABLE_DELIVERY, WEB_ORDER_TABLE_RETIRO } from "@/lib/orders/web-virtual-tables";
import type { CartItem } from "@/lib/store/order-store";

/** Ítems guardados en salon_tables o JSON de kitchen_tickets → mismo formato que el carrito POS. */
function normalizeTableItem(raw: any): CartItem {
    const name = String(raw?.name ?? "").trim() || "Ítem";
    const price = Number(raw?.price) || 0;
    const quantity = Math.max(1, Number(raw?.quantity) || 1);
    const id =
        raw?.id != null && String(raw.id).length > 0
            ? String(raw.id)
            : `qr-${name}-${price}`;
    return { id, name, price, quantity };
}

type OrderSheetProps = {
    tableId: number;
    onClose: () => void;
    onOrderComplete?: () => void;
    webOrderId?: string;
    /** Pass the full order object to skip the fetch and load the cart instantly */
    webOrderData?: any;
    initialTableData?: any;
    initialShowPayment?: boolean;
};

export function OrderSheet({ tableId, onClose, onOrderComplete, webOrderId, webOrderData, initialTableData, initialShowPayment }: OrderSheetProps) {
    const {
        cart, addToCart, setCart, removeFromCart, clearCart, updateQuantity,
        paymentMethod, setPaymentMethod, notes, setNotes,
        discount, setDiscount
    } = useOrderStore();

    const supabase = createClient();

    const { data: categories = [], isLoading: catLoading } = useCategories();
    const { data: products = [], isLoading: prodLoading } = useProducts();
    const { data: appSettings } = useAppSettings();
    const [dailyPromos, setDailyPromos] = useState<any[]>([]);
    const [isShowingDailyOffers, setIsShowingDailyOffers] = useState(false);
    const queryClient = useQueryClient();
    const createOrder = useCreateOrder();
    const sendKitchenTicket = useSendKitchenTicket();

    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const finishingRef = useRef(false);
    const [selectedWaiter, setSelectedWaiter] = useState<string>("");
    const [invoiceType, setInvoiceType] = useState('Factura C');
    const [, setClientName] = useState('Consumidor Final');

    const [isFetchingCAE, setIsFetchingCAE] = useState(false);
    const [caeData, setCaeData] = useState<{ cae: string; expiration: string; voucherNumber: number } | null>(null);
    const [isFinishing, setIsFinishing] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [isKitchenReceipt, setIsKitchenReceipt] = useState(false);
    const [isPrecuenta, setIsPrecuenta] = useState(false);
    const [extraTotal] = useState(0);
    const [discountAmountInput, setDiscountAmountInput] = useState("");

    const handleAddVarios = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const price = parseFloat(variosPrice.replace(',', '.'));
        const qty = parseInt(variosQuantity);
        if (isNaN(price) || price < 0) {
            setFeedback({ message: 'Precio inválido', type: 'error' });
            return;
        }
        if (isNaN(qty) || qty <= 0) {
            setFeedback({ message: 'Cantidad inválida', type: 'error' });
            return;
        }
        addToCart({ 
            id: `varios-${Date.now()}`, 
            name: variosName.trim() ? `Varios - ${variosName.trim()}` : 'Varios', 
            price: price, 
            quantity: qty 
        });
        setShowVariosModal(false);
        setFeedback({ message: 'Ítem agregado', type: 'success' });
    };

    const handleConfirmConfig = () => {
        if (pendingProduct) {
            // Grupo de bebida standalone (ej: "Línea Coca") → agrega solo la bebida elegida
            if (isDrinkGroupContext) {
                if (!selectedDrink || selectedDrink.name === "Sin bebida") {
                    setFeedback({ message: 'Seleccioná una bebida', type: 'error' });
                    setTimeout(() => setFeedback(null), 2000);
                    return;
                }
                addToCart({
                    id: `drink-${Math.random().toString(36).substr(2, 5)}`,
                    name: selectedDrink.name,
                    price: Number(pendingProduct.price || 0),
                    quantity: 1,
                    notes: configNotes,
                });
                setFeedback({ message: `Agregado: ${selectedDrink.name}`, type: 'success' });
                setShowConfigurator(false);
                setIsDrinkGroupContext(false);
                setIsPlatoDiaContext(false);
                return;
            }

            const pNameLower = pendingProduct.name.toLowerCase();
            const isEmpanada = pNameLower.includes("empanada");
            const isFiletProduct = pNameLower.includes("filet") || pNameLower.includes("merluza");
            const comboPrice = isPlatoDiaContext && appSettings?.plato_dia_price
                ? Number(appSettings.plato_dia_price)
                : Number(pendingProduct.price || 0);

            const isSandwichProduct = pNameLower.includes("pebete") || pNameLower.includes("sacramento") ||
                                        pNameLower.includes("sandwich");
            const cartName = isEmpanada
                ? `${pendingProduct.name} (${selectedFlavor || 'Varios'})`
                : isFiletProduct && fishStyle
                    ? `Filet ${fishStyle} con guarnición`
                    : isSandwichProduct && sandwichFilling
                        ? `${pendingProduct.name} ${sandwichFilling}`
                        : pendingProduct.name;

            addToCart({
                id: pendingProduct.id,
                name: cartName,
                price: comboPrice,
                quantity: 1,
                notes: (selectedGarnish && selectedGarnish.name !== "Sin guarnición") ? "" : configNotes // Si hay guarnición, la nota va ahí
            });
            if (selectedGarnish && selectedGarnish.name !== "Sin guarnición") {
                addToCart({ 
                    id: `combo-garnish-${Math.random().toString(36).substr(2, 5)}`, 
                    name: `Guarnición: ${selectedGarnish.name}`, 
                    price: 0, 
                    quantity: 1,
                    notes: configNotes // La nota (tomate, lechuga, etc) va en la guarnición
                });
            }
            if (selectedDrink && selectedDrink.name !== "Sin bebida") {
                let finalDrinkPrice = 0;
                if (!isEspecialContext) {
                    const matchingProduct = products.find((p: any) => p.name.toLowerCase() === selectedDrink.name.toLowerCase());
                    finalDrinkPrice = matchingProduct ? Number(matchingProduct.price) : 3900;
                }
                addToCart({ 
                    id: `combo-drink-${Math.random().toString(36).substr(2, 5)}`, 
                    name: `Bebida: ${selectedDrink.name}`, 
                    price: finalDrinkPrice, 
                    quantity: 1 
                });
            }
            setFeedback({ message: 'Agregado correctamente', type: 'success' });
            setShowConfigurator(false);
            setIsPlatoDiaContext(false);
        }
    };

    const handleSelectProduct = (item: any) => {
        // Variante expandida de bebida → directo al carrito con precio del grupo
        if (item._parentId) {
            addToCart({ id: item._parentId + '-' + item.name, name: item.name, price: item._parentPrice, quantity: 1 });
            setFeedback({ message: `Agregado: ${item.name}`, type: 'success' });
            return;
        }

        const catName = categoryMap[item.category_id] || "";
        const catNameLower = catName.toLowerCase();
        const itemNameLower = item.name.toLowerCase();

        const isEmpanada = itemNameLower.includes("empanada") || catNameLower.includes("empanada");
        const isFilet = itemNameLower.includes("filet") || itemNameLower.includes("merluza");
        const isSandwich = catNameLower.includes("sandwich") || catNameLower.includes("sanguche") ||
                           itemNameLower.includes("pebete") || itemNameLower.includes("sacramento");
        const isTarta = catNameLower.includes("tarta") || itemNameLower.includes("tarta");

        const isCoffee = itemNameLower.includes("café") || itemNameLower.includes("cafe") ||
                       itemNameLower.includes("jarrito") || itemNameLower.includes("submarino") ||
                       itemNameLower.includes("té") || (itemNameLower === "te") ||
                       catNameLower.includes("cafetería") || catNameLower.includes("cafeteria");

        const hasGarnish = itemNameLower.includes("guarnicion") || itemNameLower.includes("guarnición") ||
                           itemNameLower.includes("c/guarn") || itemNameLower.includes("con guarn");

        const isEspecialContextFlag = catNameLower.includes("menú") || catNameLower.includes("especial") ||
                                       catNameLower.includes("oferta") || catNameLower.includes("promo") ||
                                       itemNameLower.includes("especial") || itemNameLower.includes("oferta");

        // Tartas → directo al carrito, sin configurador
        if (isTarta) {
            addToCart({ id: item.id, name: item.name, price: item.price, quantity: 1 });
            return;
        }

        // Grupos de bebida (ej: "Línea Coca", "Línea Aquarius") → abre selector de bebida
        const isDrinkGroup = itemNameLower.includes("línea") || itemNameLower.includes("linea");
        if (isDrinkGroup) {
            setPendingProduct(item);
            setIsDrinkGroupContext(true);
            setIsPlatoDiaContext(false);
            setConfigStep('drink-detail');
            setSelectedDrink(null);
            setConfigNotes("");
            setShouldSkipGarnish(true);
            setShowConfigurator(true);
            return;
        }

        const isFood = !isCoffee && !isTarta && !isSandwich && (
            catNameLower.includes("plato") || catNameLower.includes("menú") ||
            catNameLower.includes("especial") || catNameLower.includes("oferta") ||
            catNameLower.includes("promo") || catNameLower.includes("empanada") ||
            itemNameLower.includes("bife") || itemNameLower.includes("filet") ||
            itemNameLower.includes("milanesa") || itemNameLower.includes("churrasco") ||
            itemNameLower.includes("pollo") || itemNameLower.includes("merluza") ||
            itemNameLower.includes("lentejas") || itemNameLower.includes("guiso") ||
            itemNameLower.includes("pasta") || itemNameLower.includes("ñoqui")
        );

        const needsConfig = isFood || isEmpanada || isFilet || isSandwich;

        if (needsConfig) {
            setPendingProduct(item);
            setIsEspecialContext(isEspecialContextFlag);
            setIsPlatoDiaContext(false);
            setShouldSkipGarnish(!hasGarnish);
            setSelectedDrinkGroup(null);
            setSelectedDrink(null);
            setSelectedGarnish(null);
            setSelectedFlavor(null);
            setFishStyle(null);
            setSandwichFilling(null);
            setConfigNotes("");

            if (isEmpanada) {
                setConfigStep('empanada-flavor');
                setEmpanadaCounts({ 'Carne': 0, 'Pollo': 0, 'Jamón y Queso': 0, 'Choclo': 0 });
            } else if (isFilet) {
                setConfigStep('fish-style');
            } else if (isSandwich) {
                setConfigStep('sandwich-filling');
            } else {
                setConfigStep('drink-detail');
            }
            setShowConfigurator(true);
        } else {
            addToCart({ id: item.id, name: item.name, price: item.price, quantity: 1 });
            setFeedback({ message: `Agregado: ${item.name}`, type: 'success' });
        }
    };
    const [productSearch, setProductSearch] = useState("");
    const [waiters, setWaiters] = useState<Array<{ id: string; full_name: string }>>([]);
    const [orderType, setOrderType] = useState<'LOCAL' | 'DELIVERY' | 'TAKEAWAY'>('LOCAL');
    const [webOrders, setWebOrders] = useState<any[]>([]);
    const [currentWebOrderId, setCurrentWebOrderId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [mpPosOrderId, setMpPosOrderId] = useState<string | null>(null);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");

    const [deliveryPersons, setDeliveryPersons] = useState<any[]>([]);
    const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState<string>("");
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [selectedCustomerBalance, setSelectedCustomerBalance] = useState<number | null>(null);
    const [customerSearchQuery, setCustomerSearchQuery] = useState("");
    const [customerResults, setCustomerResults] = useState<any[]>([]);
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
    const [webOrderIsPaid, setWebOrderIsPaid] = useState(false);
    const [webOrderPaymentMethod, setWebOrderPaymentMethod] = useState<string | null>(null);
    const [completedOrderData, setCompletedOrderData] = useState<{ cart: any[], total: number } | null>(null);
    const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
    const [showConfigurator, setShowConfigurator] = useState(false);
    const [pendingProduct, setPendingProduct] = useState<any>(null);
    const [configStep, setConfigStep] = useState<'drink-group' | 'drink-detail' | 'garnish' | 'notes' | 'empanada-flavor' | 'fish-style' | 'sandwich-filling'>('drink-group');
    const [selectedDrinkGroup, setSelectedDrinkGroup] = useState<string | null>(null);
    const [selectedDrink, setSelectedDrink] = useState<any>(null);
    const [selectedGarnish, setSelectedGarnish] = useState<any>(null);
    const [selectedFlavor, setSelectedFlavor] = useState<string | null>(null);
    const [configNotes, setConfigNotes] = useState("");
    const [empanadaCounts, setEmpanadaCounts] = useState<{[flavor: string]: number}>({ 'Carne': 0, 'Pollo': 0, 'Jamón y Queso': 0, 'Choclo': 0 });
    const [fishStyle, setFishStyle] = useState<string | null>(null);
    const [sandwichFilling, setSandwichFilling] = useState<string | null>(null);
    const [isEspecialContext, setIsEspecialContext] = useState(false); // drink is free
    const [isPlatoDiaContext, setIsPlatoDiaContext] = useState(false);  // price overridden by plato_dia_price
    const [isDrinkGroupContext, setIsDrinkGroupContext] = useState(false); // standalone drink group (línea X)
    const [shouldSkipGarnish, setShouldSkipGarnish] = useState(false);

    // Varios Modal State
    const [showVariosModal, setShowVariosModal] = useState(false);
    const [variosName, setVariosName] = useState("");
    const [variosPrice, setVariosPrice] = useState("");
    const [variosQuantity, setVariosQuantity] = useState("1");

    const handleCustomerSearch = async (q: string) => {
        setCustomerSearchQuery(q);
        if (q.length < 2) {
            setCustomerResults([]);
            return;
        }
        setIsSearchingCustomer(true);
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, phone, balance')
            .ilike('full_name', `%${q}%`)
            .limit(5);
        setCustomerResults(data || []);
        setIsSearchingCustomer(false);
    };

    useEffect(() => {
        if (!selectedCustomerId) {
            setSelectedCustomerBalance(null);
            return;
        }
        supabase.from('profiles').select('balance').eq('id', selectedCustomerId).maybeSingle()
            .then(({ data }) => {
                if (data && data.balance > 0) setSelectedCustomerBalance(data.balance);
            });
    }, [selectedCustomerId]);

    const isWebTable = tableId === WEB_ORDER_TABLE_RETIRO || tableId === WEB_ORDER_TABLE_DELIVERY;

    const releaseCurrentTable = useCallback(async (customerIdForLookup?: string | null) => {
        const nowIso = new Date().toISOString();
        const idsToRelease = new Set<number>([Number(tableId)]);

        if (tableId === WEB_ORDER_TABLE_DELIVERY || orderType === "DELIVERY") idsToRelease.add(WEB_ORDER_TABLE_DELIVERY);
        if (tableId === WEB_ORDER_TABLE_RETIRO || orderType === "TAKEAWAY") idsToRelease.add(WEB_ORDER_TABLE_RETIRO);

        const cleanCurrentName = customerName.trim().replace(/^Cliente:\s*/i, "").toLowerCase();

        const { data: occupiedRows, error: occupiedErr } = await supabase
            .from("salon_tables")
            .select("id, items")
            .eq("status", "OCCUPIED");

        if (occupiedErr) {
            console.warn("⚠️ [releaseCurrentTable] No se pudieron revisar mesas ocupadas:", occupiedErr.message);
        } else {
            (occupiedRows || []).forEach((row: any) => {
                const items = Array.isArray(row.items) ? row.items : [];
                const meta = items.find((item: any) => item?.id === "meta-customer");
                const metaCustomerId = meta?.customer_id ? String(meta.customer_id) : null;
                const metaName = String(meta?.name || "").replace(/^Cliente:\s*/i, "").trim().toLowerCase();
                const sameCustomer = customerIdForLookup && metaCustomerId === customerIdForLookup;
                const sameNamedOpenTicket = !customerIdForLookup && cleanCurrentName && metaName === cleanCurrentName;
                if (sameCustomer || sameNamedOpenTicket) idsToRelease.add(Number(row.id));
            });
        }

        const targetIds = [...idsToRelease].filter(Number.isFinite);
        if (targetIds.length === 0) return [];

        const { data: releasedTables, error: releaseErr } = await supabase
            .from("salon_tables")
            .update({
                status: "FREE",
                total: 0,
                items: [],
                updated_at: nowIso
            })
            .in("id", targetIds)
            .select("id");

        if (releaseErr) throw releaseErr;

        await supabase
            .from("kitchen_tickets")
            .delete()
            .in("table_id", targetIds);

        return releasedTables || [];
    }, [customerName, orderType, supabase, tableId]);

    useEffect(() => {
        if (initialShowPayment && cart.length > 0) {
            setShowPaymentModal(true);
        }
    }, [initialShowPayment, cart.length]);

    useEffect(() => {
        fetch("/api/delivery-persons").then(r => r.json()).then(data => {
            if (Array.isArray(data)) setDeliveryPersons(data);
        }).catch(console.error);

        // Cargar Ofertas del Día (daily_promotions)
        supabase.from('daily_promotions').select('*').eq('active', true).then(({ data }) => {
            if (data) setDailyPromos(data);
        });
    }, []);

    const onMpOrderReady = useCallback((id: string | null) => {
        setMpPosOrderId(id);
    }, []);

    // Auto-limpiar feedback después de 3 segundos
    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    // Auto-Slider para Promociones
    useEffect(() => {
        const promoProducts = products.filter((p: any) => 
            p.name.toLowerCase().includes('promo') || 
            p.name.toLowerCase().includes('oferta')
        );
        if (promoProducts.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentPromoIndex(prev => (prev + 1) % promoProducts.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [products]);

    /** Sincronizar ID de pedido web si viene por prop */
    useEffect(() => {
        if (webOrderId) {
            setCurrentWebOrderId(webOrderId);
        }
    }, [webOrderId]);

    /** Al cambiar de mesa, vaciar el store ya (evita mezclar pedidos entre mesas). */
    const lastTableIdRef = useRef<number | null>(null);
    useLayoutEffect(() => {
        // Solo limpiamos si cambiamos de mesa físicamente
        if (lastTableIdRef.current !== tableId) {
            useOrderStore.getState().clearCart();
            lastTableIdRef.current = tableId;
        }
        
        // INSTANT LOAD: If we have data from parent, use it NOW (esto SIEMPRE debe correr para sincronizar)
        if (initialTableData && initialTableData.status === 'OCCUPIED') {
            const items = Array.isArray(initialTableData.items) ? initialTableData.items : [];
            const newCartItems: CartItem[] = [];
            items.forEach((item: any) => {
                if (item.id === 'meta-customer') {
                    const rawName = item.name || "";
                    const cleanName = rawName.replace(/^Cliente:\s*/, "");
                    setCustomerName(cleanName);
                    setCustomerAddress(item.address || "");
                    setCustomerPhone(item.phone || "");
                    if (item.customer_id) {
                        setSelectedCustomerId(item.customer_id);
                    } else if (cleanName) {
                        void supabase.from('profiles').select('id').ilike('full_name', cleanName.trim()).limit(2).then(({ data: found }) => {
                            if (found?.length === 1) setSelectedCustomerId(found[0].id);
                        });
                    }
                } else {
                    newCartItems.push(normalizeTableItem(item));
                }
            });
            useOrderStore.getState().setCart(newCartItems);
        }
    }, [tableId, initialTableData]);

    const refreshData = async () => {
        if (isWebTable) {
            try {
                const resp = await fetch("/api/orders/list", { credentials: "include" });
                const res = await resp.json();
                if (!resp.ok) {
                    console.error("[OrderSheet] /api/orders/list", resp.status, res);
                    setWebOrders([]);
                    return;
                }
                if (Array.isArray(res.data)) {
                    setWebOrders(res.data.filter((o: any) => orderMatchesWebVirtualTable(o, tableId)));
                }
            } catch (e) {
                console.error("Error loading web orders:", e);
                setWebOrders([]);
            }
        } else {
            const [{ data: tableData }, { data: tickets }] = await Promise.all([
                supabase.from("salon_tables").select("id, status, items, order_type").eq("id", tableId).single(),
                supabase.from("kitchen_tickets").select("items").eq("table_id", tableId).eq("status", "pending")
            ]);

            if (tableData) {
                if (tableData.order_type) setOrderType(tableData.order_type);
                
                const metaCust = tableData.items?.find((i: any) => i.id === 'meta-customer');
                if (metaCust?.name) {
                    setCustomerName(metaCust.name.replace('Cliente: ', ''));
                }
            } else {
                if (tableId >= 100 && tableId < 200) setOrderType('DELIVERY');
                else if (tableId >= 200) setOrderType('TAKEAWAY');
                else setOrderType('LOCAL');
            }

            const status = tableData?.status as string | undefined;
            
            // SECURITY: If the table is FREE, we MUST clear any legacy data in DB to prevent "ghost orders"
            if (status !== "OCCUPIED") {
                // Non-blocking cleanup
                supabase.from("kitchen_tickets").delete().eq("table_id", tableId).then(() => {});
                supabase.from("salon_tables").update({ items: [], total: 0 }).eq("id", tableId).then(() => {});
            }

            const persisted = (status === "OCCUPIED" && Array.isArray(tableData?.items)) ? tableData.items : [];

            // Limpiar datos previos del estado local SIEMPRE
            useOrderStore.getState().clearCart();
            setCustomerName("");
            setCustomerAddress("");
            setCustomerPhone("");

            const newCartItems: CartItem[] = [];

            if (status === "OCCUPIED" && persisted.length > 0) {
                persisted.forEach((item: any) => {
                    if (item.id === 'meta-customer') {
                        const rawName = item.name || "";
                        const cleanName = rawName.replace(/^Cliente:\s*/, "");
                        setCustomerName(cleanName);
                        setCustomerAddress(item.address || "");
                        setCustomerPhone(item.phone || "");
                        if (item.customer_id) {
                            setSelectedCustomerId(item.customer_id);
                        } else if (cleanName) {
                            void supabase.from('profiles').select('id').ilike('full_name', cleanName.trim()).limit(2).then(({ data: found }) => {
                                if (found?.length === 1) setSelectedCustomerId(found[0].id);
                            });
                        }
                    } else {
                        newCartItems.push(normalizeTableItem(item));
                    }
                });
            } else if (status === "OCCUPIED" && tickets?.length) {
                // Solo si la mesa está ocupada y no hay items en salon_tables: recuperar desde tickets 
                for (const ticket of tickets) {
                    for (const raw of ticket.items || []) {
                        const item = normalizeTableItem(raw);
                        if (item.name) newCartItems.push(item);
                    }
                }
            }
            
            if (newCartItems.length > 0) {
                setCart(newCartItems);
            }
        }
    };

    const handleSelectWebOrder = (order: any) => {
        clearCart();
        setCurrentWebOrderId(order.id);
        setWebOrderIsPaid(!!order.paid);
        setWebOrderPaymentMethod(order.payment_method || null);
        if (order.customer_name) setCustomerName(order.customer_name);
        if (order.customer_phone) setCustomerPhone(order.customer_phone);
        if (order.delivery_info && order.delivery_type === 'delivery') setCustomerAddress(order.delivery_info);
        if (order.items) {
            const itemsArray = Array.isArray(order.items) 
                ? order.items 
                : (typeof order.items === 'string' ? JSON.parse(order.items) : []);
                
            const newItems: CartItem[] = [];
            itemsArray.forEach((item: any) => {
                if (!item.is_meta && item.name) {
                    newItems.push({
                        id: item.id || item.product_id || 'manual-' + Math.random(),
                        name: item.name,
                        price: Number(item.price),
                        quantity: Number(item.quantity)
                    });
                }
            });
            setCart(newItems);
        }
    };

    const handleBackToWebList = () => {
        clearCart();
        setCurrentWebOrderId(null);
        refreshData();
    };

    useEffect(() => {
        const init = async () => {
            // Load waiters only if not already loaded
            if (waiters.length === 0) {
                supabase.from('profiles').select('id, full_name').eq('is_customer', false).then(({ data }) => {
                    if (data) setWaiters(data);
                });
            }

            if (webOrderData) {
                handleSelectWebOrder(webOrderData);
            } else if (initialTableData) {
                // Already loaded in useLayoutEffect
                return;
            } else if (webOrderId) {
                // Fetch only the specific order, not the whole list
                fetch(`/api/orders/${webOrderId}`).then(r => r.json()).then(res => {
                    if (res.data) handleSelectWebOrder(res.data);
                }).catch(console.error);
            } else {
                await refreshData();
            }
        };
        init();

        // Realtime: re-fetch when kitchen_tickets change for this table
        if (!isWebTable) {
            const channel = supabase
                .channel(`kitchen-tickets-table-${tableId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'kitchen_tickets',
                    filter: `table_id=eq.${tableId}`,
                }, () => {
                    refreshData();
                })
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [tableId, webOrderId, webOrderData]);

    const persistTableState = async () => {
        if (finishingRef.current) return;
        const liveCart = useOrderStore.getState().cart; // store fresco, no closure viejo
        if (liveCart.length === 0) return;
        const currentTotal = useOrderStore.getState().getTotal();
        const currentCart = [...liveCart];
        
        // Agregar metadata del cliente como un item virtual para persistencia
        if (customerName || customerAddress || customerPhone) {
            currentCart.push({
                id: 'meta-customer',
                name: customerName,
                address: customerAddress,
                phone: customerPhone,
                customer_id: selectedCustomerId,
                price: 0,
                quantity: 1
            } as any);
        }

        // Primero intentamos UPDATE (siempre tiene permiso).
        // Condición extra: solo actualizar si la mesa SIGUE como OCCUPIED.
        // Esto evita la race condition donde finishOrder ya puso FREE y esta
        // request en vuelo (anterior a finishingRef=true) sobreescribiría esa liberación.
        const { error: updateErr } = await supabase
            .from('salon_tables')
            .update({
                status: 'OCCUPIED',
                total: currentTotal,
                items: currentCart,
                updated_at: new Date().toISOString()
            })
            .eq('id', Number(tableId))
            .eq('status', 'OCCUPIED');
        
        if (updateErr) {
            console.error("❌ persistTableState UPDATE failed:", updateErr.message);
            // Fallback: intentar INSERT por si la mesa no existe
            const { error: insertErr } = await supabase
                .from('salon_tables')
                .insert({ 
                    id: Number(tableId), 
                    status: 'OCCUPIED', 
                    total: currentTotal, 
                    items: currentCart,
                    updated_at: new Date().toISOString()
                });
            if (insertErr) {
                console.error("❌ persistTableState INSERT fallback failed:", insertErr.message);
            }
        }
    };

    useEffect(() => {
        const timer = setTimeout(persistTableState, 1000);
        return () => clearTimeout(timer);
    }, [cart, tableId, customerName, customerPhone, customerAddress, notes]);

    const handleClose = useCallback(async () => {
        // Close UI immediately
        onClose();

        if (cart.length === 0) {
            // Background cleanup
            void (async () => {
                try {
                    const { data: pendingTickets } = await supabase
                        .from('kitchen_tickets')
                        .select('id')
                        .eq('table_id', tableId)
                        .eq('status', 'PENDING')
                        .limit(1);
                    if (!pendingTickets || pendingTickets.length === 0) {
                        await supabase.from('salon_tables').update({ status: 'FREE', total: 0, items: [] }).eq('id', tableId);
                    }
                } catch (e) {
                    console.error("Error cleaning up table on close:", e);
                }
            })();
        } else {
            // Background persist
            void persistTableState();
        }
    }, [onClose, cart.length, tableId, persistTableState, supabase]);

    const handleFreeTable = async () => {
        if (!confirm('¿Liberar esta mesa? Se perderán los items sin cobrar.')) return;
        
        // Detect ID from multiple sources to ensure success
        const idToCancel = webOrderId || currentWebOrderId;

        if (idToCancel) {
            await supabase.from('orders').update({ status: 'cancelled' }).eq('id', idToCancel);
        }

        await releaseCurrentTable(selectedCustomerId);
        clearCart();
        
        if (onOrderComplete) onOrderComplete();
        onClose();
    };

    const subtotal = useOrderStore(state => state.getTotal());
    const total = subtotal + extraTotal;
    const discountAmount = Math.round(total * (discount / 100));
    const finalTotal = total - discountAmount;
    const isLoading = catLoading || prodLoading;

    useEffect(() => {
        setDiscountAmountInput(discountAmount > 0 ? String(discountAmount) : "");
    }, [discountAmount]);

    useEscape(() => {
        if (showPaymentModal) setShowPaymentModal(false);
        else if (showReceiptModal) setShowReceiptModal(false);
        else if (showConfigurator) { 
            setShowConfigurator(false); 
            setIsPlatoDiaContext(false); 
            setIsDrinkGroupContext(false); 
        }
        else if (showVariosModal) setShowVariosModal(false);
        else handleClose();
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.startsWith('F')) e.preventDefault();
            switch (e.key) {
                case 'F1': sendToKitchen(); break;
                case 'F2': setShowReceiptModal(true); break;
                case 'F3': document.getElementById('product-search')?.focus(); break;
                case 'F8': document.getElementById('customer-name-input')?.focus(); break;
                case 'F12':
                    if (total > 0 && !isFinishing) {
                        showPaymentModal ? finishOrder() : setShowPaymentModal(true);
                    }
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [total, isFinishing, showPaymentModal, showReceiptModal, showConfigurator, showVariosModal]);

    const handleEmitirFactura = async (overrideTotal?: number) => {
        const amount = overrideTotal ?? completedOrderData?.total;
        if (!amount) return;
        setIsFetchingCAE(true);
        try {
            const res = await fetch('/api/facturar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount }),
            });
            const data = await res.json();
            if (!res.ok) {
                console.error('[ARCA] Error del servidor:', data);
                throw new Error(data.details || data.error || 'Error al facturar');
            }
            console.log('[ARCA] Respuesta OK → CAE:', data.cae, '| Comprobante:', data.voucher_number);
            const cae = { cae: String(data.cae), expiration: String(data.expiration), voucherNumber: Number(data.voucher_number) };
            setCaeData(cae);
            setInvoiceType('Factura C');
            // Intentar guardar CAE en la orden más reciente de esta mesa
            try {
                const { data: latest } = await supabase.from('orders').select('id').eq('table_id', tableId).order('created_at', { ascending: false }).limit(1).single();
                if (latest?.id) await supabase.from('orders').update({ cae: cae.cae, cae_expiration: cae.expiration, voucher_number: cae.voucherNumber }).eq('id', latest.id);
            } catch {}
            setIsKitchenReceipt(false);
            setShowReceiptModal(true);
        } catch (err: any) {
            console.error('[ARCA] Excepción:', err.message);
            setFeedback({ message: `ARCA: ${err.message}`, type: 'error' });
            setTimeout(() => setFeedback(null), 8000);
        } finally {
            setIsFetchingCAE(false);
        }
    };

    const handleTicketSinValidez = () => {
        setCaeData(null);
        setInvoiceType('Sin Validez');
        setIsKitchenReceipt(false);
        setShowReceiptModal(true);
    };

    const finishOrder = async (ctx?: { mpOrderId?: string | null; customerId?: string | null; printFactura?: boolean }) => {
        if (finalTotal === 0 && discount === 0) return;
        const mpId = ctx?.mpOrderId ?? mpPosOrderId;
        const effectiveCustomerId = ctx?.customerId ?? selectedCustomerId;

        // ── CUENTA CORRIENTE: cierre directo, sin timers ni persistTableState ──
        if (paymentMethod === "CUENTA_CORRIENTE") {
            // Capturar todo antes de limpiar estado
            const capturedCart      = [...cart];
            const capturedTotal     = finalTotal;
            const capturedDiscount  = discount;
            const capturedWaiter    = selectedWaiter;
            const capturedCustName  = customerName;
            const capturedDelivery  = selectedDeliveryPerson;
            const capturedCustId    = isWebTable ? (webOrderData?.customer_id || null) : effectiveCustomerId;

            // 1. Vaciar carrito YA — sin ningún await antes para no darle tiempo a persistTableState
            clearCart();
            finishingRef.current = true;
            setIsFinishing(true);

            // 2. Para mesas reales: usar RPC atómico que libera mesa + crea orden en una transacción
            //    Para web tables: liberar manualmente (no tienen salon_tables real)
            if (!isWebTable) {
                const { data: rpcResult, error: rpcErr } = await supabase.rpc('close_table_and_create_order', {
                    p_table_id: tableId,
                    p_total: capturedTotal,
                    p_payment_method: 'CASH',
                    p_status: 'pending',
                    p_paid: false,
                    p_waiter_id: capturedWaiter || null,
                    p_customer_id: capturedCustId || null,
                    p_customer_name: capturedCustName || null,
                    p_discount: capturedDiscount,
                    p_items: capturedCart,
                    p_delivery_person_id: capturedDelivery ? parseInt(capturedDelivery) : null,
                });
                if (rpcErr) console.error('❌ [CC] close_table_and_create_order RPC failed:', rpcErr.message);
                const rpcOrderId = rpcResult?.order_id;

                // 3. Cerrar el panel
                setIsFinishing(false);
                if (onOrderComplete) onOrderComplete();
                onClose();

                // 4. Background: loyalty + cuenta_corriente flag
                void (async () => {
                    try {
                        let customerIdForDb = capturedCustId;
                        let ccResolveIssue: 'not_found' | 'multiple' | null = null;

                        if (!customerIdForDb && capturedCustName) {
                            const { data: found } = await supabase
                                .from('profiles').select('id')
                                .ilike('full_name', capturedCustName.trim()).limit(5);
                            if (found?.length === 1) {
                                customerIdForDb = found[0].id;
                            } else if (!found || found.length === 0) {
                                ccResolveIssue = 'not_found';
                            } else {
                                ccResolveIssue = 'multiple';
                            }
                        }

                        if (customerIdForDb) {
                            const coffeeCount = capturedCart.reduce((acc, item) => {
                                const n = item.name.toLowerCase();
                                return (n.includes('café') || n.includes('cafe') || n.includes('capuccino') ||
                                        n.includes('submarino') || n.includes('chocolatada') ||
                                        n.includes('lágrima') || n.includes('lagrima'))
                                    ? acc + item.quantity : acc;
                            }, 0);
                            const { data: prof } = await supabase.from('profiles')
                                .select('coffee_stamps, balance').eq('id', customerIdForDb).single();
                            const stamps = Number(prof?.coffee_stamps || 0) + coffeeCount;
                            await supabase.from('profiles').update({
                                coffee_stamps: stamps >= 10 ? stamps - 10 : stamps,
                                balance: Number(prof?.balance || 0) + capturedTotal,
                            }).eq('id', customerIdForDb);
                        }

                        if (rpcOrderId) {
                            fetch('/api/orders/paid', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ orderId: rpcOrderId, cuenta_corriente: true }),
                            }).then(res => {
                                if (!res.ok) console.error('[CC] /api/orders/paid respondió', res.status, '— cuenta_corriente NO seteado, orderId:', rpcOrderId);
                            }).catch(e => console.error('[CC] Error de red marcando cuenta_corriente:', e));
                        }

                        if (ccResolveIssue) {
                            console.error('[CC] Balance no imputado para:', capturedCustName, '—', ccResolveIssue);
                            const msg = ccResolveIssue === 'multiple'
                                ? `Hay varios clientes con el nombre "${capturedCustName}".\nNo se puede determinar a cuál cargar el saldo — imputar al equivocado sería peor que no imputar.`
                                : `No se encontró ningún cliente con el nombre "${capturedCustName}".`;
                            setTimeout(() => {
                                window.alert(
                                    `⚠️ CUENTA CORRIENTE — SALDO NO IMPUTADO\n\n${msg}\n\n` +
                                    `La venta ($${capturedTotal.toLocaleString()}) quedó registrada, pero el saldo NO fue cargado a ninguna cuenta.\n\n` +
                                    `Ajustá el balance manualmente en el panel de Clientes.`
                                );
                            }, 500);
                        }
                    } catch (e) {
                        console.error('[CC] Error en background:', e);
                    }
                })();
            } else {
                // Web tables: no tienen salon_tables, usar createOrder normal
                const { error: ccFreeErr } = await supabase.from("salon_tables").update({ status: "FREE", total: 0, items: [] }).eq("id", tableId);
                if (ccFreeErr) console.error("❌ [CC] salon_tables FREE failed:", ccFreeErr.message);

                setIsFinishing(false);
                if (onOrderComplete) onOrderComplete();
                onClose();

                void (async () => {
                    try {
                        let customerIdForDb = capturedCustId;
                        let ccResolveIssue: 'not_found' | 'multiple' | null = null;

                        if (!customerIdForDb && capturedCustName) {
                            const { data: found } = await supabase
                                .from('profiles').select('id')
                                .ilike('full_name', capturedCustName.trim()).limit(5);
                            if (found?.length === 1) {
                                customerIdForDb = found[0].id;
                            } else if (!found || found.length === 0) {
                                ccResolveIssue = 'not_found';
                            } else {
                                ccResolveIssue = 'multiple';
                            }
                        }

                        if (customerIdForDb) {
                            const coffeeCount = capturedCart.reduce((acc, item) => {
                                const n = item.name.toLowerCase();
                                return (n.includes('café') || n.includes('cafe') || n.includes('capuccino') ||
                                        n.includes('submarino') || n.includes('chocolatada') ||
                                        n.includes('lágrima') || n.includes('lagrima'))
                                    ? acc + item.quantity : acc;
                            }, 0);
                            const { data: prof } = await supabase.from('profiles')
                                .select('coffee_stamps, balance').eq('id', customerIdForDb).single();
                            const stamps = Number(prof?.coffee_stamps || 0) + coffeeCount;
                            await supabase.from('profiles').update({
                                coffee_stamps: stamps >= 10 ? stamps - 10 : stamps,
                                balance: Number(prof?.balance || 0) + capturedTotal,
                            }).eq('id', customerIdForDb);
                        }
                        const newOrder = await createOrder.mutateAsync({
                            table_id: tableId,
                            total: capturedTotal,
                            payment_method: "CASH",
                            waiter_id: capturedWaiter || null,
                            discount: capturedDiscount,
                            status: 'pending',
                            paid: false,
                            customer_id: customerIdForDb,
                            customer_name: capturedCustName || null,
                            delivery_person_id: capturedDelivery ? parseInt(capturedDelivery) : null,
                            items: capturedCart,
                        });
                        if (newOrder?.id) {
                            fetch('/api/orders/paid', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ orderId: newOrder.id, cuenta_corriente: true }),
                            }).then(res => {
                                if (!res.ok) console.error('[CC] /api/orders/paid respondió', res.status, '— cuenta_corriente NO seteado, orderId:', newOrder.id);
                            }).catch(e => console.error('[CC] Error de red marcando cuenta_corriente:', e));
                        }

                        if (ccResolveIssue) {
                            console.error('[CC] Balance no imputado para:', capturedCustName, '—', ccResolveIssue);
                            const msg = ccResolveIssue === 'multiple'
                                ? `Hay varios clientes con el nombre "${capturedCustName}".\nNo se puede determinar a cuál cargar el saldo — imputar al equivocado sería peor que no imputar.`
                                : `No se encontró ningún cliente con el nombre "${capturedCustName}".`;
                            setTimeout(() => {
                                window.alert(
                                    `⚠️ CUENTA CORRIENTE — SALDO NO IMPUTADO\n\n${msg}\n\n` +
                                    `La venta ($${capturedTotal.toLocaleString()}) quedó registrada, pero el saldo NO fue cargado a ninguna cuenta.\n\n` +
                                    `Ajustá el balance manualmente en el panel de Clientes.`
                                );
                            }, 500);
                        }
                    } catch (e) {
                        console.error('[CC] Error registrando orden en background:', e);
                    }
                })();
            }
            return;
        }

        finishingRef.current = true;
        setIsFinishing(true);
        try {
            {
                // ── NUEVA LÓGICA DE FIDELIZACIÓN Y SALDO ──
                const customerIdForDb = isWebTable ? (webOrderData?.customer_id || null) : effectiveCustomerId;
                
                if (customerIdForDb) {
                    // 1. Contar cafés para fidelidad (solo items con café en el nombre)
                    const coffeeCount = cart.reduce((acc, item) => {
                        const n = item.name.toLowerCase();
                        const esCafe = n.includes('café') || n.includes('cafe') ||
                            n.includes('capuccino') || n.includes('submarino') ||
                            n.includes('chocolatada') || n.includes('lágrima') ||
                            n.includes('lagrima');
                        return esCafe ? acc + item.quantity : acc;
                    }, 0);

                    // 2. Actualizar stamps y saldo
                    const { data: prof } = await supabase
                        .from('profiles')
                        .select('full_name, coffee_stamps, balance')
                        .eq('id', customerIdForDb)
                        .single();

                    const stampsActuales = Number(prof?.coffee_stamps || 0);
                    const stampsNuevos = stampsActuales + coffeeCount;
                    // Al llegar a 10 se usa el café gratis → guardar el resto (ej: 11 → 1)
                    const stampsFinales = stampsNuevos >= 10 ? stampsNuevos - 10 : stampsNuevos;

                    const newBalance = Number(prof?.balance || 0);

                    await supabase.from('profiles').update({
                        coffee_stamps: stampsFinales,
                        balance: newBalance
                    }).eq('id', customerIdForDb);
                } else {
                    console.warn('⚠️ [FinishOrder] No hay customerId vinculado, se omite balance/puntos.');
                }

                // ── Crear orden y liberar mesa ──
                if (!isWebTable) {
                    // Mesa real: usar RPC atómico (orden + liberar mesa + cerrar tickets en una transacción)
                    const orderStatus = (tableId >= 100) ? 'completed' : 'paid';
                    const { data: rpcResult, error: rpcErr } = await supabase.rpc('close_table_and_create_order', {
                        p_table_id: tableId,
                        p_total: finalTotal,
                        p_payment_method: paymentMethod,
                        p_status: orderStatus,
                        p_paid: true,
                        p_waiter_id: selectedWaiter || null,
                        p_customer_id: customerIdForDb || null,
                        p_customer_name: customerName || null,
                        p_discount: discount,
                        p_items: cart,
                        p_delivery_person_id: selectedDeliveryPerson ? parseInt(selectedDeliveryPerson) : null,
                    });
                    if (rpcErr) {
                        console.error("❌ [finishOrder] close_table_and_create_order RPC failed:", rpcErr.message);
                        throw rpcErr;
                    }
                    console.log("✅ [finishOrder] RPC success, order_id:", rpcResult?.order_id);
                } else {
                    // Web table: liberar manualmente y crear orden por separado
                    const { error: freeErr } = await supabase.from("salon_tables").update({ status: "FREE", total: 0, items: [] }).eq("id", tableId);
                    if (freeErr) console.error("❌ [finishOrder] salon_tables FREE failed:", freeErr.message);

                    await createOrder.mutateAsync({
                        table_id: tableId,
                        total: finalTotal,
                        payment_method: paymentMethod,
                        waiter_id: selectedWaiter || null,
                        discount: discount,
                        status: (isWebTable || tableId >= 100) ? 'completed' : 'paid',
                        paid: true,
                        customer_id: customerIdForDb,
                        customer_name: customerName || null,
                        delivery_person_id: selectedDeliveryPerson ? parseInt(selectedDeliveryPerson) : null,
                        items: cart,
                    });

                    if (webOrderId || currentWebOrderId) {
                        const idToComplete = webOrderId || currentWebOrderId;
                        const { error: updErr } = await supabase.from('orders').update({ status: 'completed' }).eq('id', idToComplete);
                        if (updErr) console.error("❌ [FinishOrder] Error actualizando pedido web:", updErr.message);
                    }

                    const releasedTables = await releaseCurrentTable(customerIdForDb);
                    if (releasedTables.length === 0) {
                        console.warn(`⚠️ [FinishOrder] No se encontró salon_tables id=${tableId} ni espejos de cliente para liberar.`);
                    }
                }

            }

            // ── INVENTARIO: descuenta stock al cobrar (única vez) ──
            try {
                const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                for (const item of cart) {
                    if (!uuidRe.test(String(item.id))) continue;

                    // Productos terminados
                    const { data: prod } = await supabase
                        .from('products')
                        .select('stock, vendidos')
                        .eq('id', item.id)
                        .maybeSingle();
                    if (prod) {
                        await supabase.from('products').update({
                            stock: (prod.stock || 0) - item.quantity,
                            vendidos: (prod.vendidos || 0) + item.quantity
                        }).eq('id', item.id);
                    }

                    // Insumos via recetas
                    const { data: recetas } = await supabase
                        .from('recetas_insumos')
                        .select('insumo_id, qty')
                        .eq('menu_product_id', item.id);
                    if (recetas?.length) {
                        for (const r of recetas) {
                            await supabase.rpc('deduct_insumo_stock', {
                                p_insumo_id: r.insumo_id,
                                p_qty: Number(r.qty) * item.quantity
                            });
                        }
                    }
                }
                queryClient.invalidateQueries({ queryKey: ['insumos'] });
                queryClient.invalidateQueries({ queryKey: ['stock'] });
            } catch (err) {
                console.error('[Stock] Error inventario:', err);
            }

            setIsKitchenReceipt(false);
            const savedCart = [...cart];
            const savedTotal = finalTotal;
            setFeedback({ message: "¡Venta registrada!", type: "success" });
            clearCart();

            setTimeout(() => {
                setFeedback(null);
                finishingRef.current = false;
                setIsFinishing(false);
                if (ctx?.printFactura) {
                    setCompletedOrderData({ cart: savedCart, total: savedTotal });
                    handleEmitirFactura(savedTotal);
                } else {
                    if (onOrderComplete) onOrderComplete();
                    onClose();
                }
            }, 800);
        } catch (error: any) {
            // La mesa ya fue liberada (salon_tables → FREE corre antes del insert).
            // Limpiar carrito de inmediato para que persistTableState no la re-ocupe.
            clearCart();
            finishingRef.current = false;
            setIsFinishing(false);
            setFeedback({ message: `Error al registrar la orden: ${error.message}`, type: "error" });
            setTimeout(() => {
                setFeedback(null);
                if (onOrderComplete) onOrderComplete();
                onClose();
            }, 3000);
        }
    };

    const sendToKitchen = async (skipClose = false, onlyKitchen = false) => {
        if (cart.length === 0) {
            setFeedback({ message: "La comanda está vacía", type: 'error' });
            setTimeout(() => setFeedback(null), 2000);
            return;
        }
        setIsFinishing(true);

        // ══════════════════════════════════════════════════════════
        // PASO 0: GUARDAR MESA COMO OCCUPIED — ANTES QUE TODO
        // Esto se ejecuta PRIMERO, independiente de cocina/inventario
        // ══════════════════════════════════════════════════════════
        try {
            const metaItems = [];
            if (customerName || selectedCustomerId) {
                metaItems.push({
                    id: 'meta-customer',
                    name: `Cliente: ${customerName || 'Alias'}`,
                    customer_id: selectedCustomerId,
                    price: 0,
                    quantity: 1,
                    category: 'METADATA'
                });
            }
            const fullCartItems = [...metaItems, ...cart];

            const { data: updData, error: updErr } = await supabase.from("salon_tables")
                .update({
                    items: fullCartItems,
                    status: 'OCCUPIED',
                    total: cart.reduce((sum, i) => sum + (i.price * i.quantity), 0),
                    updated_at: new Date().toISOString()
                })
                .eq('id', Number(tableId))
                .select();

            if (updErr) {
                const { error: insErr } = await supabase.from("salon_tables")
                    .insert({
                        id: Number(tableId),
                        items: fullCartItems,
                        status: 'OCCUPIED',
                        total: cart.reduce((sum, i) => sum + (i.price * i.quantity), 0),
                        updated_at: new Date().toISOString()
                    });
                if (insErr) {
                    setFeedback({ message: `Error DB: ${insErr.message}`, type: 'error' });
                }
            } else if (!updData || updData.length === 0) {
                const { error: insErr2 } = await supabase.from("salon_tables")
                    .insert({
                        id: Number(tableId),
                        items: fullCartItems,
                        status: 'OCCUPIED',
                        total: cart.reduce((sum, i) => sum + (i.price * i.quantity), 0),
                        updated_at: new Date().toISOString()
                    });
                if (insErr2) {
                    setFeedback({ message: `Error DB: ${insErr2.message}`, type: 'error' });
                }
            }
        } catch (mesaErr: any) {
            setFeedback({ message: `Error mesa: ${mesaErr.message}`, type: 'error' });
        }

        // ══════════════════════════════════════════════════════════
        // PASO 1: ENVIAR TICKET A COCINA
        // ══════════════════════════════════════════════════════════
        try {
            await sendKitchenTicket.mutateAsync({
                table_id: String(tableId),
                items: cart,
                notes: notes || "",
            });
        } catch (ticketErr: any) {
            console.error("⚠️ Error enviando ticket a cocina:", ticketErr.message);
            // No bloqueamos — la mesa ya está guardada
        }

        // Stock se descuenta solo al cobrar (finishOrder), no al mandar a cocina

        setFeedback({ message: "Enviado a cocina ✅", type: 'success' });
        
        // No mostramos la pantalla de éxito si es solo una comanda de cocina
        if (skipClose && !onlyKitchen) {
            setCompletedOrderData({ cart: [...cart], total: total });
        }

        if (onOrderComplete) onOrderComplete();
        
        setTimeout(() => {
            setFeedback(null);
            if (!skipClose) {
                onClose(); 
            }
        }, 600);
        setIsFinishing(false);
    };

    const normalize = (s: string) =>
        (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const categoryMap = useMemo(() => {
        const map: Record<string, string> = {};
        categories.forEach((c: any) => { map[c.id] = c.name; });
        return map;
    }, [categories]);

    const searchTerm = normalize(productSearch.trim());

    const DRINK_VARIANTS: Record<string, string[]> = {
        'coca':    ['Coca-Cola', 'Coca Zero', 'Sprite', 'Sprite Zero', 'Schweppes Pomelo', 'Aquarius Pera', 'Aquarius Manzana', 'Aquarius Pomelo', 'Aquarius Uva', 'Agua sin Gas', 'Agua con Gas'],
        'cerveza': ['Quilmes', 'Stella Artois', 'Patagonia', 'Corona'],
        'jugo':    ['Jugo de Naranja', 'Limonada', 'Exprimido'],
        'vino':    ['Vino Tinto', 'Vino Blanco', 'Copa de Vino'],
    };

    const expandDrinkGroups = (list: any[]): any[] => {
        const result: any[] = [];
        for (const p of list) {
            const n = normalize(p.name);
            const matchKey = Object.keys(DRINK_VARIANTS).find(k => n.includes(k));
            if (matchKey) {
                DRINK_VARIANTS[matchKey].forEach(variant => {
                    result.push({ ...p, id: `${p.id}-${variant}`, name: variant, _parentId: p.id, _parentPrice: p.price });
                });
            } else {
                result.push(p);
            }
        }
        return result;
    };

    const displayProducts = useMemo(() => {
        if (searchTerm) {
            return products.filter((p: any) =>
                normalize(p.name).includes(searchTerm) ||
                normalize(p.description ?? '').includes(searchTerm)
            );
        }
        if (activeCategory) {
            const catName = normalize(categoryMap[activeCategory] || '');
            const filtered = products.filter((p: any) => p.category_id === activeCategory);
            if (catName.includes('bebida')) return expandDrinkGroups(filtered);
            return filtered;
        }
        return products;
    }, [products, productSearch, activeCategory, categoryMap]);

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        products.forEach((p: any) => {
            if (p.category_id) {
                counts[p.category_id] = (counts[p.category_id] || 0) + 1;
            }
        });
        return counts;
    }, [products]);

    const featuredProduct = useMemo(() => {
        return appSettings?.plato_del_dia_id 
            ? products.find((p: any) => p.id === appSettings.plato_del_dia_id)
            : products.find((p: any) => p.kind === 'plato_del_dia');
    }, [appSettings, products]);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50">
                <IconLoader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden">

            {/* ── HEADER: Minimalist & Premium ── */}
            <div className="px-8 py-6 bg-white border-b border-slate-100 shrink-0 shadow-sm z-20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        {isWebTable && currentWebOrderId && (
                            <button onClick={handleBackToWebList} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95">
                                <IconChevronLeft size={22} className="text-slate-900" />
                            </button>
                        )}
                        
                        <div className="relative group">
                            <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-slate-200 transition-all group-hover:scale-105">
                                <span className="font-bold text-3xl tracking-tighter">
                                    {(() => {
                                        const clean = customerName.replace('Cliente: ', '');
                                        if (tableId === WEB_ORDER_TABLE_RETIRO) return 'R';
                                        if (tableId === WEB_ORDER_TABLE_DELIVERY) return 'E';
                                        if (clean) return clean.charAt(0).toUpperCase();
                                        return tableId < 100 ? tableId : 'N';
                                    })()}
                                </span>
                            </div>
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex flex-col relative">
                                <input
                                    id="customer-name-input"
                                    type="text"
                                    value={customerSearchQuery !== "" ? customerSearchQuery : customerName.replace('Cliente: ', '')}
                                    onChange={(e) => {
                                        setCustomerSearchQuery(e.target.value);
                                        setCustomerName(e.target.value);
                                        if (!e.target.value) {
                                            setSelectedCustomerId(null);
                                            setCustomerResults([]);
                                        } else {
                                            handleCustomerSearch(e.target.value);
                                        }
                                    }}
                                    placeholder={tableId < 100 ? `Mesa ${tableId}` : "Nombre del pedido..."}
                                    className="text-4xl font-black text-slate-900 tracking-tighter leading-none bg-transparent border-none outline-none p-0 w-full placeholder:text-slate-200"
                                />
                                {customerResults.length > 0 && customerSearchQuery && (
                                    <div className="absolute top-full left-0 w-80 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden divide-y divide-gray-50">
                                        {customerResults.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    setSelectedCustomerId(c.id);
                                                    setCustomerName(c.full_name);
                                                    setSelectedCustomerBalance(c.balance);
                                                    setCustomerSearchQuery("");
                                                    setCustomerResults([]);
                                                }}
                                                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex flex-col items-start transition-colors"
                                            >
                                                <div className="font-bold text-gray-900 leading-tight">{c.full_name}</div>
                                                <div className="flex justify-between w-full items-center mt-1">
                                                    <span className="text-[10px] text-gray-400 font-bold tracking-widest">{c.phone || "Sin tel"}</span>
                                                    {Number(c.balance || 0) > 0 && (
                                                        <span className="text-[10px] font-black text-red-500">Deuda: ${Number(c.balance).toLocaleString()}</span>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const cycle: Array<'LOCAL' | 'DELIVERY' | 'TAKEAWAY'> = ['LOCAL', 'DELIVERY', 'TAKEAWAY'];
                                        const next = cycle[(cycle.indexOf(orderType) + 1) % cycle.length];
                                        setOrderType(next);
                                        supabase.from('salon_tables').update({ order_type: next }).eq('id', tableId).then(() => {});
                                    }}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${orderType === 'LOCAL' ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : orderType === 'DELIVERY' ? 'bg-sky-100 text-sky-600 hover:bg-sky-200' : 'bg-amber-100 text-amber-600 hover:bg-amber-200'}`}
                                    title="Clic para cambiar"
                                >
                                    {orderType === 'LOCAL' ? 'Salón' : orderType === 'DELIVERY' ? 'Delivery' : 'Retiro'}
                                </button>
                                <span className="text-[10px] text-slate-400 font-bold">• {cart.reduce((s, i) => s + i.quantity, 0)} ÍTEMS</span>
                                {Number(selectedCustomerBalance) > 0 && !customerSearchQuery && (
                                    <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100 ml-1">
                                        DEUDA: ${Number(selectedCustomerBalance).toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={selectedWaiter}
                            onChange={(e) => setSelectedWaiter(e.target.value)}
                            className="h-10 px-3 bg-slate-50 border border-transparent rounded-xl text-xs font-bold text-slate-600 outline-none hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            <option value="">Mozo...</option>
                            {waiters.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                        </select>

                        <button
                            onClick={() => {
                                setIsKitchenReceipt(false);
                                setIsPrecuenta(true);
                                setShowReceiptModal(true);
                            }}
                            className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all active:scale-95"
                            title="Imprimir Pre-cuenta"
                        >
                            <IconPrinter size={20} />
                        </button>
                    </div>

                        <div className="h-10 w-[1px] bg-gray-100 mx-2" />

                        <button
                            onClick={handleFreeTable}
                            className="h-11 px-5 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                        >
                            Liberar
                        </button>
                        
                        <button
                            onClick={handleClose}
                            className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-900 transition-all active:scale-90"
                        >
                            <IconX size={20} />
                        </button>
                    </div>
                </div>

            {/* ── BODY ── */}
            <div className="flex-1 flex overflow-hidden">

                {/* ── IZQUIERDA: búsqueda + categorías + productos ── */}
                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* Barra de búsqueda */}
                    <div className="px-4 py-3 bg-white border-b border-gray-100 shrink-0 flex gap-2">
                        <div className="relative flex-1">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                            <input
                                id="product-search"
                                type="text"
                                autoFocus
                                value={productSearch}
                                onChange={(e) => { setProductSearch(e.target.value); setActiveCategory(null); }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && displayProducts.length > 0) {
                                        handleSelectProduct(displayProducts[0]);
                                        setProductSearch("");
                                    }
                                }}
                                placeholder="Buscar producto..."
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 border border-gray-200 outline-none focus:ring-2 focus:ring-gray-300 transition-all"
                                autoComplete="off"
                            />
                        </div>
                        <button
                            onClick={() => {
                                setVariosName("");
                                setVariosPrice("");
                                setVariosQuantity("1");
                                setShowVariosModal(true);
                            }}
                            className="bg-gray-900 text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all shadow-md shrink-0 flex items-center"
                        >
                            + Varios
                        </button>
                    </div>

                    {/* Sub-header: volver a categorías cuando hay una activa */}
                    {(activeCategory || searchTerm) && (
                        <div className="px-4 py-2 bg-white border-b border-gray-100 shrink-0 flex items-center gap-2">
                            <button
                                onClick={() => { setActiveCategory(null); setProductSearch(''); }}
                                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                <IconChevronLeft size={14} />
                                {searchTerm
                                    ? `Resultados para "${productSearch}"`
                    : (categories.find((c: any) => c.id === activeCategory)?.name ?? 'Categoría')}
                            </button>
                        </div>
                    )}

                    {/* Área principal: categorías o productos */}
                    <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
                        {isShowingDailyOffers ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-black text-slate-900">Ofertas del Día</h3>
                                    <button 
                                        onClick={() => setIsShowingDailyOffers(false)}
                                        className="text-xs font-bold text-slate-400 hover:text-slate-900"
                                    >
                                        Volver ←
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {dailyPromos.map(promo => (
                                        <button
                                            key={promo.id}
                                            onClick={() => {
                                                const nameLower = (promo.name || "").toLowerCase();
                                                const isCoffee = nameLower.includes("café") || nameLower.includes("cafe") || 
                                                               nameLower.includes("jarrito") || nameLower.includes("té") || 
                                                               nameLower.includes("te") || nameLower.includes("submarino");
                                                
                                                if (isCoffee) {
                                                    addToCart({
                                                        id: `promo-${promo.id}`,
                                                        name: promo.name,
                                                        price: promo.price || 0,
                                                        quantity: 1
                                                    });
                                                    setFeedback({ message: `Agregado: ${promo.name}`, type: 'success' });
                                                } else {
                                                    addToCart({
                                                        id: `promo-${promo.id}`,
                                                        name: promo.name,
                                                        price: promo.price || 0,
                                                        quantity: 1
                                                    });
                                                    setFeedback({ message: `Agregado: ${promo.name}`, type: 'success' });
                                                }
                                            }}
                                            className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm text-left hover:scale-[1.02] active:scale-98 transition-all group"
                                        >
                                            <h4 className="text-lg font-black text-slate-900 mb-1 group-hover:text-blue-600">{promo.name}</h4>
                                            <p className="text-2xl font-black text-slate-900">${(promo.price || 0).toLocaleString()}</p>
                                        </button>
                                    ))}
                                    {dailyPromos.length === 0 && (
                                        <div className="col-span-2 py-12 text-center">
                                            <p className="text-slate-400 font-bold">No hay ofertas cargadas hoy.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : !searchTerm && !activeCategory ? (
                            <div className="flex flex-col gap-4">
                                {/* ── Accesos rápidos — barra Bloom ── */}
                                <div className="flex gap-2.5 mb-4">

                                    {/* Plato del Día — pill verde inglés destacado */}
                                    <button
                                        onClick={() => {
                                            if (featuredProduct) {
                                                setPendingProduct(featuredProduct);
                                                const nameLower = featuredProduct.name.toLowerCase();
                                                const platoDiaHasGarnish = nameLower.includes("guarnicion") || nameLower.includes("guarnición") ||
                                                                            nameLower.includes("c/guarn") || nameLower.includes("con guarn");
                                                setConfigStep('drink-detail');
                                                setSelectedDrinkGroup(null);
                                                setSelectedDrink(null);
                                                setSelectedGarnish(null);
                                                setSelectedFlavor(null);
                                                setConfigNotes("");
                                                setShouldSkipGarnish(!platoDiaHasGarnish);
                                                setIsEspecialContext(true);
                                                setIsPlatoDiaContext(true);
                                                setShowConfigurator(true);
                                            } else {
                                                const cat = categories.find(c => c.name.toLowerCase().includes('plato'));
                                                if (cat) setActiveCategory(cat.id);
                                            }
                                        }}
                                        className="flex-[1.3] flex items-center px-4 py-3 rounded-xl bg-english-700 text-bloom-cream text-left hover:bg-english-600 active:scale-[0.98] transition-all min-h-[60px]"
                                    >
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-bloom-gold/70 mb-0.5">Plato del Día</span>
                                            <span className="text-[13px] font-bold leading-tight text-bloom-cream truncate">
                                                {featuredProduct ? featuredProduct.name : "Sin configurar →"}
                                            </span>
                                            {featuredProduct && (
                                                <span className="text-[10px] text-bloom-gold font-bold mt-0.5">
                                                    {appSettings?.plato_dia_price && Number(appSettings.plato_dia_price) > 0
                                                        ? `$${Number(appSettings.plato_dia_price).toLocaleString()} · c/bebida`
                                                        : `$${Number(featuredProduct.price).toLocaleString()}`}
                                                </span>
                                            )}
                                        </div>
                                    </button>

                                    {/* Ofertas del Día — pill crema con borde dorado */}
                                    <button
                                        onClick={() => {
                                            setIsShowingDailyOffers(true);
                                            setActiveCategory(null);
                                            setProductSearch("");
                                        }}
                                        className="flex-1 flex items-center px-4 py-3 rounded-xl bg-bloom-cream border border-bloom-gold/30 text-left hover:bg-bloom-100 hover:border-bloom-gold/60 active:scale-[0.98] transition-all min-h-[60px]"
                                    >
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-bloom-gold-dark mb-0.5">Acceso rápido</span>
                                            <span className="text-[13px] font-bold text-english-700 leading-tight">Ofertas del Día</span>
                                        </div>
                                    </button>

                                    {/* Platos Diarios — pill crema con borde dorado */}
                                    <button
                                        onClick={() => {
                                            const cat = categories.find(c => c.name.toLowerCase().includes('plato') && !c.name.toLowerCase().includes('día'));
                                            if (cat) setActiveCategory(cat.id);
                                        }}
                                        className="flex-1 flex items-center px-4 py-3 rounded-xl bg-bloom-cream border border-bloom-gold/30 text-left hover:bg-bloom-100 hover:border-bloom-gold/60 active:scale-[0.98] transition-all min-h-[60px]"
                                    >
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-bloom-gold-dark mb-0.5">Menú</span>
                                            <span className="text-[13px] font-bold text-english-700 leading-tight">Platos Diarios</span>
                                        </div>
                                    </button>

                                </div>

                                {/* Grilla de Categorías — paleta Bloom */}
                                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
                                {(() => {
                                    const priorityOrder = (name: string): number => {
                                        const n = name.toLowerCase().trim();
                                        if (n.includes('plato')) return 0;
                                        if (n.includes('promoci') || n.includes('oferta')) return 1;
                                        if (n.includes('desayuno') || n.includes('merienda')) return 2;
                                        return 99;
                                    };
                                    const getCategoryIcon = (name: string) => {
                                        const n = name.toLowerCase();
                                        const props = { size: 20, stroke: 1.5 };
                                        if (n.includes('ensala') || n.includes('vegeta'))                                                                              return <IconSalad {...props} />;
                                        if (n.includes('carne') || n.includes('mila') || n.includes('bife') || n.includes('lomo') || n.includes('parri') || n.includes('poll')) return <IconMeat {...props} />;
                                        if (n.includes('pizza') || n.includes('muzza') || n.includes('fuga'))                                                          return <IconPizza {...props} />;
                                        if (n.includes('hamb') || n.includes('burg'))                                                                                  return <IconBurger {...props} />;
                                        if (n.includes('desayuno') || n.includes('merienda') || n.includes('caf') || n.includes('latte') || n.includes('capu'))        return <IconCoffee {...props} />;
                                        if (n.includes('infus') || n.includes('te '))                                                                                  return <IconCup {...props} />;
                                        if (n.includes('helad') || n.includes('postr'))                                                                                return <IconIceCream {...props} />;
                                        if (n.includes('torta') || n.includes('dulc') || n.includes('cake'))                                                           return <IconCake {...props} />;
                                        if (n.includes('soda') || n.includes('agua') || n.includes('gaseosa') || n.includes('bebida'))                                 return <IconBottle {...props} />;
                                        if (n.includes('cerve') || n.includes('pinta') || n.includes('alco'))                                                          return <IconBeer {...props} />;
                                        if (n.includes('vino') || n.includes('copa'))                                                                                  return <IconGlass {...props} />;
                                        if (n.includes('pan') || n.includes('factu') || n.includes('medialun') || n.includes('sandwich'))                              return <IconBread {...props} />;
                                        if (n.includes('pasta') || n.includes('fideo') || n.includes('sopa'))                                                          return <IconSoup {...props} />;
                                        if (n.includes('empa'))                                                                                                        return <IconCookie {...props} />;
                                        if (n.includes('queso') || n.includes('tabla'))                                                                                return <IconCheese {...props} />;
                                        if (n.includes('pescado') || n.includes('maris'))                                                                              return <IconFish {...props} />;
                                        if (n.includes('verdura') || n.includes('vegano'))                                                                             return <IconCarrot {...props} />;
                                        if (n.includes('promo') || n.includes('oferta'))                                                                               return <IconStar {...props} />;
                                        return <IconToolsKitchen2 {...props} />;
                                    };
                                    return categories.filter(c =>
                                        !c.name.toLowerCase().includes('plato') &&
                                        !c.name.toLowerCase().includes('menú')
                                    ).sort((a: any, b: any) => {
                                        const prioA = priorityOrder(a.name);
                                        const prioB = priorityOrder(b.name);
                                        if (prioA !== prioB) return prioA - prioB;
                                        return (a.sort_order || 0) - (b.sort_order || 0);
                                    }).map((cat: any) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className="group relative h-20 bg-bloom-cream border border-bloom-gold/20 rounded-xl p-2.5 flex flex-col items-center justify-center gap-1.5 hover:bg-english-600 hover:border-english-600 active:scale-95 transition-all"
                                        >
                                            <div className="text-english-600 group-hover:text-bloom-cream transition-colors">
                                                {getCategoryIcon(cat.name)}
                                            </div>
                                            <span className="text-[9px] font-bold uppercase tracking-tight text-english-700 group-hover:text-bloom-cream text-center leading-tight line-clamp-2 transition-colors">
                                                {cat.name}
                                            </span>
                                        </button>
                                    ));
                                })()}
                                </div>
                            </div>
                        ) : (
                            /* Productos: grilla Bloom */
                            <div className="grid gap-3 w-full pb-20 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
                                {displayProducts.map((item: any) => {
                                    const getSmartIcon = (name: string, cat: string) => {
                                        const n = (name + " " + cat).toLowerCase();
                                        const props = { size: 22, stroke: 1.5 };
                                        if (n.includes('rucula') || n.includes('ensala') || n.includes('vegeta')) return <IconSalad {...props} />;
                                        if (n.includes('mila') || n.includes('carne') || n.includes('bife') || n.includes('lomo') || n.includes('parri') || n.includes('beef')) return <IconMeat {...props} />;
                                        if (n.includes('poll') || n.includes('supre') || n.includes('alitas')) return <IconMeat {...props} />;
                                        if (n.includes('piz') || n.includes('muzza') || n.includes('fuga')) return <IconPizza {...props} />;
                                        if (n.includes('ham') || n.includes('burg')) return <IconBurger {...props} />;
                                        if (n.includes('caf') || n.includes('latte') || n.includes('capu')) return <IconCoffee {...props} />;
                                        if (n.includes('te ') || n.includes('infus')) return <IconCup {...props} />;
                                        if (n.includes('helad') || n.includes('postr')) return <IconIceCream {...props} />;
                                        if (n.includes('torta') || n.includes('dulc') || n.includes('cake')) return <IconCake {...props} />;
                                        if (n.includes('soda') || n.includes('agua') || n.includes('coca')) return <IconBottle {...props} />;
                                        if (n.includes('jug') || n.includes('batid')) return <IconGlassFull {...props} />;
                                        if (n.includes('cerve') || n.includes('pinta')) return <IconBeer {...props} />;
                                        if (n.includes('vino')) return <IconGlass {...props} />;
                                        if (n.includes('papa') || n.includes('frit')) return <IconToolsKitchen2 {...props} />;
                                        if (n.includes('factu') || n.includes('media') || n.includes('pan')) return <IconBread {...props} />;
                                        if (n.includes('pasta') || n.includes('fideo')) return <IconSoup {...props} />;
                                        if (n.includes('empa')) return <IconCookie {...props} />;
                                        return <IconToolsKitchen2 {...props} />;
                                    };

                                    const catName = categoryMap[item.category_id] || "";
                                    const IconComponent = getSmartIcon(item.name, catName);

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleSelectProduct(item)}
                                            className="group relative bg-bloom-cream border border-bloom-gold/20 rounded-2xl p-4 hover:shadow-md hover:border-english-600 hover:-translate-y-0.5 transition-all flex flex-col items-center justify-center gap-3 overflow-hidden min-h-[130px]"
                                        >
                                            <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-english-600 group-hover:bg-english-700 group-hover:text-bloom-cream transition-all shadow-sm">
                                                {IconComponent}
                                            </div>

                                            <div className="text-center">
                                                <p className="text-[9px] font-bold text-bloom-gold-dark uppercase tracking-[0.12em] mb-1">{catName}</p>
                                                <p className="text-[12px] font-bold text-english-900 leading-tight tracking-tight mb-2 line-clamp-2 group-hover:text-english-700">
                                                    {item.name}
                                                </p>
                                                <span className="inline-block px-3 py-1 bg-white border border-bloom-gold/30 text-english-700 group-hover:bg-english-700 group-hover:text-bloom-cream group-hover:border-english-700 rounded-lg text-[11px] font-bold tracking-tight transition-all">
                                                    ${Number(item.price || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── DERECHA: Datos Cliente + Carrito ── */}
                <div className="w-72 xl:w-96 flex flex-col bg-white border-l border-bloom-gold/20 shrink-0">

                    {/* Banner de Entrega / Contacto si corresponde */}
                    {(customerAddress || customerPhone) && (
                        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200/70 rounded-2xl text-xs flex flex-col gap-1 shadow-sm shrink-0">
                            {customerAddress && (
                                <div className="font-bold text-red-950 flex items-start gap-1.5 leading-snug">
                                    <span className="shrink-0 text-sm">📍</span>
                                    <span>{customerAddress}</span>
                                </div>
                            )}
                            {customerPhone && (
                                <div className="text-[11px] font-bold text-red-800 flex items-center gap-1.5">
                                    <span className="shrink-0">📞</span>
                                    <span>{customerPhone}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Lista de Productos en el Carrito */}
                    <div className="flex-1 overflow-y-auto px-4 py-2 no-scrollbar scroll-smooth">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                                <IconToolsKitchen2 size={40} className="mb-2" />
                                <p className="text-xs font-bold uppercase tracking-widest">Carrito Vacío</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {cart.map((item, index) => (
                                    <div key={index} className="group relative bg-white border border-gray-100 p-3 rounded-2xl flex gap-3 items-center hover:border-black transition-all">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-all shrink-0">
                                            <IconToolsKitchen2 size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-900 truncate uppercase tracking-tight">{item.name}</p>
                                            <p className="text-[10px] font-black text-slate-400 mt-0.5">
                                                ${Number(item.price).toLocaleString()} x {item.quantity}
                                            </p>
                                            {item.notes && <p className="text-[9px] text-slate-900 font-bold mt-1 leading-tight">{item.notes}</p>}
                                        </div>
                                        <div className="shrink-0 flex items-center gap-1.5">
                                            <div className="flex items-center bg-slate-50 rounded-xl p-1 px-1.5 gap-2">
                                                <button
                                                    onClick={() => updateQuantity(index, -1)}
                                                    className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 hover:text-red-500 active:scale-95 disabled:opacity-50"
                                                >
                                                    <span className="font-bold text-sm leading-none">-</span>
                                                </button>
                                                <span className="text-xs font-black text-slate-700 w-4 text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(index, 1)}
                                                    className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 hover:text-emerald-500 active:scale-95"
                                                >
                                                    <span className="font-bold text-sm leading-none">+</span>
                                                </button>
                                            </div>
                                            <span className="text-xs font-black text-slate-900 tracking-tight w-16 text-right">
                                                ${(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}
                                            </span>
                                            <button
                                                onClick={() => removeFromCart(index)}
                                                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:bg-red-50 hover:text-red-500 active:scale-90 transition-all"
                                                title="Quitar"
                                            >
                                                <IconTrash size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer del carrito — paleta Bloom */}
                    <div className="p-8 bg-bloom-cream border-t border-bloom-gold/30 flex flex-col gap-4 shrink-0">
                        <div className="relative">
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Notas de cocina..."
                                className="w-full px-5 py-3.5 bg-white border border-bloom-gold/30 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-english-600/10 focus:border-english-600 transition-all placeholder:text-bloom-300 shadow-sm"
                            />
                        </div>

                        <div className="flex items-center justify-between px-2">
                            <span className="text-[10px] font-bold text-bloom-600 uppercase tracking-widest">Subtotal</span>
                            <span className="text-2xl font-bold text-english-900 tracking-tighter">${total.toLocaleString()}</span>
                        </div>

                        {/* Descuento en pesos */}
                        <div className="flex items-center gap-4 px-2">
                            <span className="text-[10px] font-bold text-bloom-600 uppercase tracking-widest shrink-0">Descuento $</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={discountAmountInput}
                                onChange={(e) => {
                                    const rawValue = e.target.value.replace(/\D/g, "");
                                    if (rawValue === "") {
                                        setDiscountAmountInput("");
                                        setDiscount(0);
                                        return;
                                    }
                                    const pesos = Math.min(total, Math.max(0, Number(rawValue)));
                                    setDiscountAmountInput(String(pesos));
                                    const pct = total > 0 ? (pesos / total) * 100 : 0;
                                    setDiscount(Math.round(pct * 100) / 100);
                                }}
                                placeholder="0"
                                className="w-full bg-white border border-bloom-gold/30 rounded-xl px-4 py-2 text-sm font-black text-right outline-none focus:border-english-600 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>

                        <div className="flex items-center justify-between px-2 pt-1 border-t border-bloom-gold/20">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${discount > 0 ? 'text-emerald-500' : 'text-bloom-600'}`}>
                                {discount > 0 ? 'Total con descuento' : 'Total Final'}
                            </span>
                            <span className={`text-4xl font-bold tracking-tighter ${discount > 0 ? 'text-emerald-600' : 'text-english-900'}`}>
                                ${finalTotal.toLocaleString()}
                            </span>
                        </div>

                        {/* Delivery Person Selector */}
                        {(orderType === 'DELIVERY' || orderType === 'TAKEAWAY') && (
                            <div className="mt-2">
                                <label className="block text-[10px] font-black text-bloom-600 uppercase tracking-widest mb-1.5 ml-1">Repartidor (opcional)</label>
                                <select
                                    value={selectedDeliveryPerson}
                                    onChange={(e) => setSelectedDeliveryPerson(e.target.value)}
                                    className="w-full bg-white border border-bloom-gold/30 rounded-xl px-4 py-2.5 text-xs font-bold text-english-700 outline-none focus:ring-4 focus:ring-english-600/10 focus:border-english-600 transition-all"
                                >
                                    <option value="">-- Sin asignar --</option>
                                    {deliveryPersons.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button
                            onClick={() => webOrderIsPaid ? finishOrder() : setShowPaymentModal(true)}
                            disabled={finalTotal === 0 || isFinishing}
                            className={`w-full h-16 rounded-[1.5rem] font-bold text-lg transition-all disabled:cursor-not-allowed ${
                                finalTotal === 0 || isFinishing
                                    ? 'bg-bloom-cream border border-bloom-gold/20 text-gris shadow-none'
                                    : webOrderIsPaid
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-xl shadow-emerald-200'
                                        : 'bg-english-700 text-bloom-cream hover:bg-english-600 active:scale-95 shadow-xl shadow-english-900/20'
                            }`}
                        >
                            {webOrderIsPaid
                                ? `Finalizar Pago`
                                : `Ir a Cobrar`
                            }
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => sendToKitchen()}
                                disabled={cart.length === 0 || isFinishing}
                                className="h-14 bg-bloom-cream border border-bloom-gold/30 text-english-700 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-bloom-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                            >
                                Enviar pedido
                            </button>
                            <button
                                onClick={async () => {
                                    setIsKitchenReceipt(true); // Es comanda mozo
                                    await sendToKitchen(true, true); // Enviamos a cocina sin cerrar todavía (esperamos al modal)
                                    setShowReceiptModal(true); // Abrimos el ticket para imprimir
                                }}
                                disabled={cart.length === 0 || isFinishing}
                                className="h-14 bg-bloom-cream border border-bloom-gold/30 text-english-700 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-bloom-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <IconPrinter size={16} /> Comanda Mozo
                            </button>
                        </div>
                </div>
            </div>


            {/* ── MODALES ── */}
            {showReceiptModal && (
                <ReceiptModal
                    tableId={tableId}
                    invoiceType={invoiceType}
                    extraTotal={extraTotal}
                    cart={completedOrderData ? completedOrderData.cart : cart}
                    total={completedOrderData ? completedOrderData.total : total}
                    customerName={customerName}
                    customerId={selectedCustomerId || webOrderData?.customer_id}
                    isKitchen={isKitchenReceipt}
                    isPreview={isPrecuenta}
                    cae={caeData?.cae}
                    voucherNumber={caeData?.voucherNumber}
                    caeExpiration={caeData?.expiration}
                    onClose={() => {
                        setShowReceiptModal(false);
                        setCaeData(null);
                        setIsPrecuenta(false);
                        if (isKitchenReceipt) {
                            setIsKitchenReceipt(false);
                            onClose();
                        } else if (completedOrderData) {
                            setCompletedOrderData(null);
                            if (onOrderComplete) onOrderComplete();
                            onClose();
                        }
                    }}
                />
            )}

            {showPaymentModal && (
                <PaymentModal
                    tableId={tableId}
                    total={total}
                    finalTotal={finalTotal}
                    discount={discount}
                    setDiscount={setDiscount}
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    cart={cart}
                    isFinishing={isFinishing}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setMpPosOrderId(null);
                    }}
                    onConfirm={finishOrder}
                    onMpOrderReady={onMpOrderReady}
                    waiterId={selectedWaiter || null}
                    selectedCustomerId={selectedCustomerId}
                    setSelectedCustomerId={setSelectedCustomerId}
                    customerName={customerName}
                    setCustomerName={setCustomerName}
                />
            )}

            {/* ── FEEDBACK ── */}
            <AnimatePresence>
                {feedback && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            className={`pointer-events-auto px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3 text-center ${
                                feedback.type === 'success' ? 'bg-gray-900 text-white' : 'bg-white text-red-500 border border-red-100'
                            }`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${feedback.type === 'success' ? 'bg-white/10' : 'bg-red-50'}`}>
                                {feedback.type === 'success' ? <IconCheck size={24} className="text-white" /> : <IconX size={24} className="text-red-500" />}
                            </div>
                            <p className="font-bold text-lg">{feedback.message}</p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Product Configurator Modal (Drink, Garnish, Notes) */}
            <AnimatePresence>
                {showConfigurator && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="absolute inset-0 bg-black/70 backdrop-blur-xl"
                            onClick={() => { setShowConfigurator(false); setIsPlatoDiaContext(false); setIsDrinkGroupContext(false); }}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 30 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.9, y: 30 }} 
                            className="relative bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden p-10"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Personalizar Pedido</h2>
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
                                        {pendingProduct?.name}
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setShowConfigurator(false); setIsPlatoDiaContext(false); setIsDrinkGroupContext(false); }}
                                    className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-black transition-colors"
                                >
                                    <IconX size={28} />
                                </button>
                            </div>

                            {/* Stepper Header */}
                            <div className="flex gap-1.5 mb-6">
                                {(() => {
                                    const n = pendingProduct?.name.toLowerCase() ?? '';
                                    if (n.includes('empanada')) return ['flavor', 'notes'];
                                    if (n.includes('filet') || n.includes('merluza')) return ['estilo', 'bebida', 'guarnicion', 'notas'];
                                    if (configStep === 'sandwich-filling' || n.includes('pebete') || n.includes('sacramento')) return ['relleno', 'notas'];
                                    return ['bebida', 'guarnicion', 'notas'];
                                })().map((step) => (
                                    <div
                                        key={step}
                                        className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                                            (step === 'estilo' && configStep === 'fish-style') ||
                                            (step === 'relleno' && configStep === 'sandwich-filling') ||
                                            (step === 'bebida' && (configStep === 'drink-group' || configStep === 'drink-detail')) ||
                                            (step === 'guarnicion' && configStep === 'garnish') ||
                                            (step === 'flavor' && configStep === 'empanada-flavor') ||
                                            (step === 'notas' && configStep === 'notes') ||
                                            (step === 'notes' && configStep === 'notes')
                                                ? 'bg-black' : 'bg-gray-100'
                                        }`}
                                    />
                                ))}
                            </div>

                            <div className="min-h-[300px]">
                                {configStep === 'fish-style' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <h3 className="text-lg font-black mb-4 flex items-center gap-2">🐟 ¿Cómo lo querés?</h3>
                                        <div className="flex flex-col gap-3">
                                            {['Empanado', 'A la romana'].map(style => (
                                                <button
                                                    key={style}
                                                    onClick={() => {
                                                        setFishStyle(style);
                                                        setConfigStep('drink-detail');
                                                    }}
                                                    className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-black hover:text-white hover:border-black transition-all text-left font-black text-base"
                                                >
                                                    {style}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {configStep === 'sandwich-filling' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <h3 className="text-lg font-black mb-4 flex items-center gap-2">🥪 ¿Con qué relleno?</h3>
                                        <div className="flex flex-col gap-3">
                                            {['Salame y Queso', 'Jamón y Queso'].map(filling => (
                                                <button
                                                    key={filling}
                                                    onClick={() => {
                                                        setSandwichFilling(filling);
                                                        setConfigStep('notes');
                                                    }}
                                                    className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-black hover:text-white hover:border-black transition-all text-left font-black text-base"
                                                >
                                                    {filling}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {configStep === 'empanada-flavor' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <h3 className="text-lg font-black mb-2 flex items-center gap-2">🥟 Elegí los gustos</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                                            Seleccioná la cantidad de cada sabor
                                        </p>
                                        <div className="flex flex-col gap-3">
                                            {['Carne', 'Pollo', 'Jamón y Queso', 'Choclo'].map(flavor => (
                                                <div key={flavor} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50">
                                                    <p className="font-black text-sm uppercase tracking-wide">{flavor}</p>
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => setEmpanadaCounts(prev => ({ ...prev, [flavor]: Math.max(0, (prev[flavor] || 0) - 1) }))}
                                                            className="w-10 h-10 rounded-xl bg-gray-200 hover:bg-gray-300 font-black text-lg active:scale-90 transition-all"
                                                        >−</button>
                                                        <span className="w-8 text-center font-black text-lg">{empanadaCounts[flavor] || 0}</span>
                                                        <button
                                                            onClick={() => setEmpanadaCounts(prev => ({ ...prev, [flavor]: (prev[flavor] || 0) + 1 }))}
                                                            className="w-10 h-10 rounded-xl bg-black text-white font-black text-lg active:scale-90 transition-all"
                                                        >+</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 flex items-center justify-between">
                                            <p className="text-sm font-bold text-slate-500">
                                                Total: <span className="text-black font-black">{Object.values(empanadaCounts).reduce((a, b) => a + b, 0)}</span> empanadas
                                            </p>
                                            <button
                                                onClick={() => {
                                                    const totalEmpanadas = Object.values(empanadaCounts).reduce((a, b) => a + b, 0);
                                                    if (totalEmpanadas === 0) {
                                                        setFeedback({ message: 'Elegí al menos un gusto', type: 'error' });
                                                        setTimeout(() => setFeedback(null), 2000);
                                                        return;
                                                    }
                                                    // Armar el detalle de gustos
                                                    const detalles = Object.entries(empanadaCounts)
                                                        .filter(([_, qty]) => qty > 0)
                                                        .map(([flavor, qty]) => `${qty} ${flavor}`)
                                                        .join(', ');
                                                    setSelectedFlavor(detalles);
                                                    setConfigStep('notes');
                                                }}
                                                className="px-6 py-3 rounded-xl bg-black text-white font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                                            >
                                                Confirmar Gustos
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {configStep === 'drink-detail' && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                        <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                                            🥤 Selección de Bebida
                                        </h3>
                                        <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2 pb-4">
                                            {(isEspecialContext 
                                                ? ["Coca-Cola", "Coca Zero", "Sprite", "Sprite Zero", "Schweppes Pomelo", "Aquarius Pera", "Aquarius Manzana", "Aquarius Pomelo", "Aquarius Uva", "Agua sin Gas", "Agua con Gas"]
                                                : ["Coca-Cola", "Coca Zero", "Sprite", "Sprite Zero", "Schweppes Pomelo", "Aquarius Pera", "Aquarius Manzana", "Aquarius Pomelo", "Aquarius Uva", "Agua sin Gas", "Agua con Gas", "Quilmes", "Stella Artois", "Patagonia", "Corona", "Vino Tinto", "Vino Blanco", "Copa de Vino", "Jugo de Naranja", "Limonada", "Exprimido"]
                                            ).map(drink => (
                                                <button
                                                    key={drink}
                                                    onClick={() => { 
                                                        setSelectedDrink({ name: drink }); 
                                                        setConfigStep(shouldSkipGarnish ? 'notes' : 'garnish'); 
                                                    }}
                                                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-black hover:text-white hover:border-black transition-all text-left"
                                                >
                                                    <p className="font-bold text-xs">{drink}</p>
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => { 
                                                    setSelectedDrink({ name: "Sin bebida" }); 
                                                    setConfigStep(shouldSkipGarnish ? 'notes' : 'garnish'); 
                                                }}
                                                className="p-3 rounded-xl bg-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 text-left col-span-2 text-center mt-2"
                                            >
                                                Sin bebida
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {configStep === 'garnish' && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                        <h3 className="text-lg font-black mb-4 flex items-center gap-2">🥗 Guarnición</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['Puré de Papas', 'Papas Fritas', 'Puré Mixto', 'Ensalada'].map(g => (
                                                <button
                                                    key={g}
                                                    onClick={() => { 
                                                        setSelectedGarnish({ name: g }); 
                                                        setConfigStep('notes'); 
                                                        if (g === 'Ensalada') setFeedback({ message: 'Recordá poner el sabor de la ensalada en notas', type: 'success' });
                                                    }}
                                                    className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-black hover:text-white hover:border-black transition-all text-left"
                                                >
                                                    <p className="font-black text-xs uppercase tracking-wider">{g}</p>
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => { setSelectedGarnish({ name: "Sin guarnición" }); setConfigStep('notes'); }}
                                                className="p-4 rounded-2xl bg-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-widest"
                                            >
                                                Sin guarnición
                                            </button>
                                        </div>
                                        <button onClick={() => setConfigStep('drink-detail')} className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black">← Volver a bebida</button>
                                    </motion.div>
                                )}

                                {configStep === 'notes' && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                        <h3 className="text-lg font-black mb-4">📝 Observaciones {selectedGarnish?.name === 'Ensalada' && <span className="text-red-500">(Sabor de ensalada)</span>}</h3>
                                        <textarea
                                            value={configNotes}
                                            onChange={(e) => setConfigNotes(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleConfirmConfig();
                                                }
                                            }}
                                            placeholder={selectedGarnish?.name === 'Ensalada' ? "Especificá el sabor de la ensalada..." : "Ej: Sin sal, carne bien cocida..."}
                                            className="w-full p-5 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-4 ring-black/5 outline-none font-bold text-base min-h-[120px] resize-none"
                                        />
                                        
                                        <div className="mt-6 flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const n = pendingProduct?.name.toLowerCase() ?? '';
                                                    const isSandwichBack = n.includes('pebete') || n.includes('sacramento') || n.includes('sandwich');
                                                    if (isSandwichBack) setConfigStep('sandwich-filling');
                                                    else if (shouldSkipGarnish) setConfigStep('drink-detail');
                                                    else setConfigStep('garnish');
                                                }}
                                                className="flex-1 py-4 rounded-xl bg-gray-100 text-gray-500 font-black text-[10px] uppercase tracking-widest"
                                            >
                                                Volver
                                            </button>
                                            <button 
                                                onClick={handleConfirmConfig}
                                                className="flex-[2] py-4 rounded-xl bg-black text-white font-black text-[10px] uppercase tracking-widest shadow-xl"
                                            >
                                                Finalizar y Agregar
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Varios Modal */}
            <AnimatePresence>
                {showVariosModal && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="absolute inset-0 bg-black/70 backdrop-blur-xl"
                            onClick={() => setShowVariosModal(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 30 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.9, y: 30 }} 
                            className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-10"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Agregar Varios</h2>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Ítem manual</p>
                                </div>
                                <button
                                    onClick={() => setShowVariosModal(false)}
                                    className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-black transition-colors"
                                >
                                    <IconX size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleAddVarios} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nombre / Descripción</label>
                                    <input
                                        type="text"
                                        autoFocus
                                        value={variosName}
                                        onChange={(e) => setVariosName(e.target.value)}
                                        placeholder="Ej: Plato Especial, Postre Extra..."
                                        className="w-full px-5 py-4 bg-gray-50 border-transparent rounded-2xl font-bold text-lg focus:bg-white focus:ring-4 ring-black/5 outline-none transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Precio Unitario ($)</label>
                                        <input
                                            type="number"
                                            value={variosPrice}
                                            onChange={(e) => setVariosPrice(e.target.value)}
                                            placeholder="0"
                                            className="w-full px-5 py-4 bg-gray-50 border-transparent rounded-2xl font-bold text-lg focus:bg-white focus:ring-4 ring-black/5 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Cantidad</label>
                                        <input
                                            type="number"
                                            value={variosQuantity}
                                            onChange={(e) => setVariosQuantity(e.target.value)}
                                            placeholder="1"
                                            className="w-full px-5 py-4 bg-gray-50 border-transparent rounded-2xl font-bold text-lg focus:bg-white focus:ring-4 ring-black/5 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-5 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-black/10 active:scale-95 transition-all mt-4"
                                >
                                    Agregar al Pedido
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    </div>
);
}
