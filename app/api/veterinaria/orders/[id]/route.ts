/**
 * GET /api/veterinaria/orders/:id — seguimiento de un pedido (modo supabase).
 * El id es un UUID no adivinable que funciona como enlace privado de seguimiento.
 */
import { INTEGRATIONS } from "@/lib/vet/config/integrations";
import { adminRepo, badRequest } from "@/lib/vet/server/supabase-admin";
import { rowToItem } from "@/lib/vet/data/supabase-repository";
import type { Order } from "@/lib/vet/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (INTEGRATIONS.dataSource !== "supabase") return badRequest("Modo demo", 409);
  const { id } = await params;
  if (!/^o_[0-9a-f-]{36}$/.test(id)) return badRequest("Pedido no encontrado", 404);
  const { client } = adminRepo();
  const { data } = await client.from("vet_orders").select("*").eq("id", id).maybeSingle();
  if (!data) return badRequest("Pedido no encontrado", 404);
  const order = rowToItem<Order>(data);
  // Sin datos internos: solo lo necesario para el seguimiento.
  const { customerId: _c, ...publicOrder } = order;
  return Response.json({ order: publicOrder });
}
