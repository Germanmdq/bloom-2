import type { Metadata } from "next";
import { AssistantChat } from "@/components/veterinaria/store/AssistantChat";

export const metadata: Metadata = { title: "Asistente", description: "Te ayudamos a encontrar productos, servicios, turnos, ubicación y contacto." };

export default function AsistentePage() {
  return <AssistantChat />;
}
