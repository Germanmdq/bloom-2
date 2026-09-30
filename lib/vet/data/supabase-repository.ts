/**
 * Repositorio sobre Supabase (PostgreSQL). Cada colección es una tabla
 * `vet_*` con columnas en snake_case; los objetos anidados (variantes,
 * ítems del pedido, dirección, etc.) se guardan como jsonb.
 *
 * La seguridad la dan las políticas RLS de la migración
 * `supabase/migrations/20260930120000_veterinaria_module.sql`:
 * un visitante solo puede leer el catálogo público; el staff administra.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { VetSettings } from "../types";
import { TABLES, type CollectionName, type Collections, type VetRepository } from "./repository";

const toSnake = (s: string) => s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

export function rowToItem<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (v !== null) out[toCamel(k)] = v;
  return out as T;
}

export function itemToRow(item: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(item)) if (v !== undefined) out[toSnake(k)] = v;
  return out;
}

export class SupabaseRepository implements VetRepository {
  readonly mode = "supabase" as const;
  constructor(private client: SupabaseClient) {}

  async list<K extends CollectionName>(name: K): Promise<Collections[K][]> {
    const { data, error } = await this.client.from(TABLES[name]).select("*").limit(5000);
    if (error) throw new Error(`[vet] ${TABLES[name]}: ${error.message}`);
    // Costos y proveedores viven en vet_product_costs (solo personal), nunca en esta lectura.
    return (data ?? []).map((row) => rowToItem<Collections[K]>(row));
  }

  async upsert<K extends CollectionName>(name: K, item: Collections[K]): Promise<Collections[K]> {
    const { error } = await this.client.from(TABLES[name]).upsert(itemToRow(item as object));
    if (error) throw new Error(`[vet] ${TABLES[name]}: ${error.message}`);
    return item;
  }

  async upsertMany<K extends CollectionName>(name: K, items: Collections[K][]): Promise<void> {
    if (!items.length) return;
    const { error } = await this.client.from(TABLES[name]).upsert(items.map((i) => itemToRow(i as object)));
    if (error) throw new Error(`[vet] ${TABLES[name]}: ${error.message}`);
  }

  async remove<K extends CollectionName>(name: K, id: string): Promise<void> {
    const { error } = await this.client.from(TABLES[name]).delete().eq("id", id);
    if (error) throw new Error(`[vet] ${TABLES[name]}: ${error.message}`);
  }

  async getSettings(): Promise<Partial<VetSettings>> {
    const { data } = await this.client.from("vet_settings").select("data").eq("id", "main").maybeSingle();
    return (data?.data as Partial<VetSettings>) ?? {};
  }

  async saveSettings(settings: VetSettings): Promise<void> {
    const { error } = await this.client.from("vet_settings").upsert({ id: "main", data: settings, updated_at: new Date().toISOString() });
    if (error) throw new Error(`[vet] vet_settings: ${error.message}`);
  }

  /** Tiempo real: pedidos y turnos nuevos aparecen solos en el panel. */
  subscribe(onChange: (name: CollectionName | "settings") => void): () => void {
    const reverse = new Map(Object.entries(TABLES).map(([k, v]) => [v, k as CollectionName]));
    const channel = this.client
      .channel("vet-changes")
      .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
        const name = reverse.get(payload.table);
        if (name) onChange(name);
        else if (payload.table === "vet_settings") onChange("settings");
      })
      .subscribe();
    return () => {
      this.client.removeChannel(channel);
    };
  }
}
