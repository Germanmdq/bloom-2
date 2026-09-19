import { useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createClient } from '../supabase/client';
import { useWhatsAppStore, WhatsAppOrder, WhatsAppOrderStatus } from '../store/whatsappStore';
import { toast } from 'sonner';

const NOTIFICATION_SOUND_URL = '/notification.mp3'; // Ensure you add a sound file to public folder or use an external URL

export function useWhatsAppPedidos() {
    const supabase = createClient();
    const { setPedidos, addPedido, updatePedido, pedidos } = useWhatsAppStore();

    // --- Fetch Initial Data ---
    const { data, isLoading, error } = useQuery({
        queryKey: ['whatsapp_pedidos'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pedidos_whatsapp')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data as WhatsAppOrder[];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Sync with store
    useEffect(() => {
        if (data) {
            setPedidos(data);
        }
    }, [data, setPedidos]);

    // --- Realtime Subscription ---
    useEffect(() => {
        const channel = supabase
            .channel('whatsapp-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'pedidos_whatsapp',
                },
                (payload: any) => {
                    console.log('🔔 Realtime change:', payload);

                    if (payload.eventType === 'INSERT') {
                        const newOrder = payload.new as WhatsAppOrder;
                        addPedido(newOrder);

                        // Play sound
                        const audio = new Audio(NOTIFICATION_SOUND_URL);
                        audio.play().catch(e => console.log('Audio play failed', e));

                        // Show toast
                        toast.success(`Nuevo pedido de ${newOrder.nombre_cliente || newOrder.numero_cliente}`);
                    }
                    else if (payload.eventType === 'UPDATE') {
                        const updatedOrder = payload.new as WhatsAppOrder;
                        updatePedido(updatedOrder.id, updatedOrder);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, addPedido, updatePedido]);

    // --- Mutations ---
    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: number; status: WhatsAppOrderStatus }) => {
            const { error } = await supabase
                .from('pedidos_whatsapp')
                .update({ estado: status })
                .eq('id', id);

            if (error) throw error;
            return { id, status };
        },
        onSuccess: ({ id, status }) => {
            updatePedido(id, { estado: status });
            toast.success(`Estado actualizado a ${status}`);

            // If status is 'listo' or 'confirmado', we might want to trigger a WhatsApp message
            // This is ideally handled by the database trigger calling an Edge Function 
            // or the Node service polling/listening (which we haven't implemented for outbound status yet, 
            // but the service has an endpoint ready for it)
        },
        onError: (err) => {
            toast.error('Error actualizando estado');
            console.error(err);
        }
    });

    return {
        pedidos,
        isLoading,
        error,
        updateStatus: updateStatusMutation.mutate,
        isUpdating: updateStatusMutation.isPending
    };
}
