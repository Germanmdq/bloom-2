"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { IconLock, IconBackspace } from "@tabler/icons-react";
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
      className="flex h-screen w-full overflow-hidden bg-[#F5F5F7]"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      <div className="dashboard-scope flex h-screen w-full">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="relative h-full flex-1 overflow-y-auto">
          <div className="mx-auto h-full max-w-7xl p-4 pb-20 md:p-8 md:pb-8">
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
