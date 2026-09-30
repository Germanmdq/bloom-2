"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { IconLock, IconBackspace } from "@tabler/icons-react";
import { IconBell, IconMenu2, IconSearch } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { SalesComparisonPanel, ComparisonType } from "@/components/dashboard/SalesComparisonPanel";
import { LowStockBanner } from "./LowStockBanner";
import "@/app/dashboard/dashboard.css";

export function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [comparisonPanel, setComparisonPanel] = useState<ComparisonType | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const sectionTitle = pathname === "/dashboard" ? "Resumen" : pathname.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ") ?? "Dashboard";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        window.dispatchEvent(new CustomEvent('bloom-close-all'));
        setComparisonPanel(null);
      }
      if (e.key !== "F1" && e.key !== "F2") return;
      if (document.querySelector('[data-ordersheet="active"]')) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      e.preventDefault();
      const key = e.key.toLowerCase() as "f1" | "f2";
      const stored = localStorage.getItem(`bloom_${key}_action`) as ComparisonType | null;
      const action: ComparisonType = stored ?? (key === "f1" ? "yesterday" : "last_week");
      setComparisonPanel(action);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);



  return (
    <div
      className="flex h-screen w-full overflow-hidden bg-[#fafafa]"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      <div className="dashboard-scope flex h-screen w-full">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="relative h-full flex-1 overflow-y-auto">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200/80 bg-[#fafafa]/90 px-4 backdrop-blur md:px-8">
            <button onClick={() => setSidebarOpen(true)} className="rounded-md p-2 text-gray-600 hover:bg-gray-100 md:hidden" aria-label="Abrir menú">
              <IconMenu2 size={20} />
            </button>
            <div className="hidden text-sm font-medium capitalize text-gray-500 sm:block">Panel / <span className="text-gray-900">{sectionTitle}</span></div>
            <div className="ml-auto hidden w-full max-w-xs items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400 lg:flex">
              <IconSearch size={16} />
              <span>Buscar en Bloom...</span>
              <kbd className="ml-auto text-[10px]">⌘ K</kbd>
            </div>
            <button className="rounded-md p-2 text-gray-500 hover:bg-gray-100" aria-label="Notificaciones"><IconBell size={19} /></button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2d4a3e] text-xs font-bold text-white">B</div>
          </header>
          <div className="mx-auto min-h-[calc(100%-4rem)] max-w-7xl p-4 pb-20 md:p-8 md:pb-8">
            <LowStockBanner />
            {children}
          </div>
        </main>
        <MobileBottomNav onMoreClick={() => setSidebarOpen(true)} />
      </div>

      {comparisonPanel && (
        <SalesComparisonPanel comparisonType={comparisonPanel} onClose={() => setComparisonPanel(null)} />
      )}
    </div>
  );
}
