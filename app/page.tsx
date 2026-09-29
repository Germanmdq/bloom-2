"use client";

import dynamic from "next/dynamic";

const MenuPage = dynamic(() => import("./menu/page"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f5ef]">
      <div className="w-10 h-10 border-4 border-[#c4b896] border-t-[#1a3028] rounded-full animate-spin" />
    </div>
  ),
});

export default function HomePage() {
  return <MenuPage />;
}
