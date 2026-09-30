/**
 * Acceso de servidor para el módulo Veterinaria (modo supabase).
 * Usa la service role SOLO en rutas de servidor para operaciones que el
 * visitante no puede hacer directo (crear pedidos/turnos con precios
 * recalculados). Nunca importar desde componentes de cliente.
 */
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { SupabaseRepository } from "../data/supabase-repository";
import { mergeSettings } from "../data/settings";
import type { Customer } from "../types";

export function adminRepo() {
  const client = createServiceRoleClient();
  return { client, repo: new SupabaseRepository(client) };
}

export async function loadSettings(repo: SupabaseRepository) {
  return mergeSettings(await repo.getSettings());
}

const digits = (p: string) => p.replace(/\D/g, "").slice(-8);

/** Busca un cliente por teléfono (últimos 8 dígitos) o lo crea. */
export async function upsertCustomerByPhone(
  repo: SupabaseRepository,
  input: { name: string; phone: string; email?: string; marketingOptIn?: boolean; address?: Customer["address"] },
  userId?: string,
): Promise<Customer> {
  const all = await repo.list("customers");
  const found = all.find((c) => (userId && c.userId === userId) || digits(c.phone) === digits(input.phone));
  const now = new Date().toISOString();
  const customer: Customer = found
    ? { ...found, name: input.name || found.name, email: input.email || found.email, address: input.address ?? found.address, marketingOptIn: input.marketingOptIn ?? found.marketingOptIn, userId: found.userId ?? userId, updatedAt: now }
    : { id: `c_${crypto.randomUUID()}`, userId, name: input.name, phone: input.phone, email: input.email, address: input.address, points: 0, favoriteIds: [], marketingOptIn: Boolean(input.marketingOptIn), createdAt: now, updatedAt: now };
  await repo.upsert("customers", customer);
  return customer;
}

export function badRequest(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function isValidPhone(p: unknown): p is string {
  return typeof p === "string" && p.replace(/\D/g, "").length >= 8 && p.length <= 30;
}

export function isValidName(n: unknown): n is string {
  return typeof n === "string" && n.trim().length >= 2 && n.length <= 80;
}
