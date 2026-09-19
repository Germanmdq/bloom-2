
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { Toaster } from "sonner";
import PWAProvider from "@/components/PWA/PWAProvider";
import InstallPrompt from "@/components/PWA/InstallPrompt";

export default function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // 1 minute
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <PWAProvider>
                {children}
                <InstallPrompt />
            </PWAProvider>
            <Toaster position="top-right" richColors />
        </QueryClientProvider>
    );
}
