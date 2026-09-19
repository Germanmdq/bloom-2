"use client";

import { useWhatsAppPedidos } from "@/lib/hooks/useWhatsAppPedidos";

export function WhatsAppNotificationListener() {
    // This hook handles the Supabase Realtime subscription
    // and triggers the toast + sound notifications automatically.
    useWhatsAppPedidos();

    return null;
}
