"use client";

import { useOrderNotification } from "@/lib/hooks/useOrderNotification";

export function OrderNotificationListener() {
    useOrderNotification();
    return null;
}
