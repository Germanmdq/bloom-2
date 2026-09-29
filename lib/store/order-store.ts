import { create } from "zustand";
import type { PaymentMethod } from "@/lib/types";

export interface CartItem {
    id: string; // Product ID required for Stock
    name: string;
    price: number;
    quantity: number;
    description?: string;
    notes?: string;
}

interface OrderState {
    tableId: string;
    setTableId: (id: string) => void;

    cart: CartItem[];
    addToCart: (item: CartItem) => void;
    setCart: (items: CartItem[]) => void;
    removeFromCart: (index: number) => void;
    updateQuantity: (index: number, delta: number) => void;
    clearCart: () => void;

    paymentMethod: PaymentMethod;
    setPaymentMethod: (method: PaymentMethod) => void;

    notes: string;
    setNotes: (notes: string) => void;

    discount: number;
    setDiscount: (discount: number) => void;

    // Computed
    getTotal: () => number;
}

export const useOrderStore = create<OrderState>((set, get) => ({
    tableId: '1',
    setTableId: (id) => set({ tableId: id }),

    cart: [],
    addToCart: (item) => set((state) => {
        const existingIdx = state.cart.findIndex(i =>
            item.id && i.id ? i.id === item.id : i.name === item.name
        );
        if (existingIdx >= 0) {
            const newCart = state.cart.map((c, i) =>
                i === existingIdx ? { ...c, quantity: c.quantity + item.quantity } : c
            );
            return { cart: newCart };
        }
        return { cart: [...state.cart, item] };
    }),
    setCart: (items) => set({ cart: items }),
    removeFromCart: (index) => set((state) => ({
        cart: state.cart.filter((_, i) => i !== index)
    })),
    updateQuantity: (index, delta) => set((state) => {
        const newCart = [...state.cart];
        const item = newCart[index];
        const newQty = item.quantity + delta;

        if (newQty <= 0) {
            return { cart: state.cart.filter((_, i) => i !== index) };
        }

        newCart[index].quantity = newQty;
        return { cart: newCart };
    }),
    clearCart: () => set({ cart: [], notes: '', discount: 0, paymentMethod: 'CASH' }),

    paymentMethod: 'CASH',
    setPaymentMethod: (method) => set({ paymentMethod: method }),

    notes: '',
    setNotes: (notes) => set({ notes }),

    discount: 0,
    setDiscount: (discount) => set({ discount }),

    getTotal: () => {
        const state = get();
        return state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
}));
