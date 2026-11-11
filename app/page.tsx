"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import DesktopHome from "./page.backup";

const MenuPage = dynamic(() => import("./menu/page"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f5ef]">
      <div className="w-10 h-10 border-4 border-[#c4b896] border-t-[#1a3028] rounded-full animate-spin" />
    </div>
  ),
});

export default function HomePage() {
  const [desktop, setDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  if (desktop === null) return <div className="min-h-screen bg-[#f7f5ef]" />;
  return desktop ? <DesktopHome /> : <MenuPage />;
}
