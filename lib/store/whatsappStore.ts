import { create } from 'zustand';

export type WhatsAppOrderStatus = 'pendiente' | 'confirmado' | 'preparando' | 'listo' | 'entregado' | 'cancelado';

export interface WhatsAppOrder {
    id: number;
    numero_cliente: string;
    nombre_cliente: string | null;
    mensaje: string;
    items_parseados: {
        items: Array<{
            nombre: string;
            cantidad: number;
            notas?: string;
        }>;
        tipo_entrega?: 'delivery' | 'retiro';
        direccion?: string;
        notas_generales?: string;
    } | null;
    estado: WhatsAppOrderStatus;
    total: number | null;
    tiempo_estimado: number | null;
    notas: string | null;
    created_at: string;
    updated_at: string;
}

interface WhatsAppStore {
    pedidos: WhatsAppOrder[];
    isConnected: boolean;
    isLoading: boolean;

    setPedidos: (pedidos: WhatsAppOrder[]) => void;
    addPedido: (pedido: WhatsAppOrder) => void;
    updatePedido: (id: number, updates: Partial<WhatsAppOrder>) => void;
    setConnectionStatus: (status: boolean) => void;
    setLoading: (loading: boolean) => void;
}

export const useWhatsAppStore = create<WhatsAppStore>((set) => ({
    pedidos: [],
    isConnected: false,
    isLoading: true,

    setPedidos: (pedidos) => set({ pedidos }),

    addPedido: (pedido) => set((state) => ({
        pedidos: [pedido, ...state.pedidos]
    })),

    updatePedido: (id, updates) => set((state) => ({
        pedidos: state.pedidos.map((p) =>
            p.id === id ? { ...p, ...updates } : p
        )
    })),

    setConnectionStatus: (status) => set({ isConnected: status }),
    setLoading: (loading) => set({ isLoading: loading }),
}));
