import type { Metadata } from "next";
import { FavoritesView } from "@/components/veterinaria/store/FavoritesView";

export const metadata: Metadata = { title: "Mis favoritos", robots: { index: false } };

export default function FavoritosPage() {
  return <FavoritesView />;
}
