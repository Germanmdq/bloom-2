/**
 * Repositorio del MODO DEMO: guarda cada colección en el navegador
 * (localStorage) para poder probar la aplicación completa sin backend.
 *
 * ⚠️ No es apto para producción: los datos viven solo en ese navegador.
 * Para operar de verdad, usar NEXT_PUBLIC_VET_DATA_SOURCE=supabase.
 */
import type { VetSettings } from "../types";
import type { CollectionName, Collections, VetRepository } from "./repository";

const PREFIX = "vdp:v1:";
const SETTINGS_KEY = `${PREFIX}settings`;

type Loader = <K extends CollectionName>(name: K) => Promise<Collections[K][]>;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("[vet] No se pudo guardar en el navegador (¿almacenamiento lleno?)", err);
  }
}

export class LocalRepository implements VetRepository {
  readonly mode = "demo" as const;
  private memory = new Map<CollectionName, unknown[]>();

  /** `seed` se carga con import() dinámico para no inflar el bundle inicial. */
  constructor(private loadSeed: Loader) {}

  async list<K extends CollectionName>(name: K): Promise<Collections[K][]> {
    const cached = this.memory.get(name);
    if (cached) return cached as Collections[K][];
    let items = read<Collections[K][]>(PREFIX + name);
    if (!items) {
      items = await this.loadSeed(name);
      // El catálogo semilla no se guarda hasta que se modifique (ahorra espacio).
      if (name !== "products") write(PREFIX + name, items);
    }
    this.memory.set(name, items);
    return items;
  }

  private async save<K extends CollectionName>(name: K, items: Collections[K][]) {
    this.memory.set(name, items);
    write(PREFIX + name, items);
  }

  async upsert<K extends CollectionName>(name: K, item: Collections[K]): Promise<Collections[K]> {
    const items = [...(await this.list(name))];
    const id = (item as { id: string }).id;
    const idx = items.findIndex((x) => (x as { id: string }).id === id);
    if (idx >= 0) items[idx] = item;
    else items.unshift(item);
    await this.save(name, items);
    return item;
  }

  async upsertMany<K extends CollectionName>(name: K, list: Collections[K][]): Promise<void> {
    const items = [...(await this.list(name))];
    const index = new Map(items.map((x, i) => [(x as { id: string }).id, i]));
    for (const item of list) {
      const i = index.get((item as { id: string }).id);
      if (i != null) items[i] = item;
      else items.unshift(item);
    }
    await this.save(name, items);
  }

  async remove<K extends CollectionName>(name: K, id: string): Promise<void> {
    const items = (await this.list(name)).filter((x) => (x as { id: string }).id !== id);
    await this.save(name, items);
  }

  async getSettings(): Promise<Partial<VetSettings>> {
    return read<Partial<VetSettings>>(SETTINGS_KEY) ?? {};
  }

  async saveSettings(settings: VetSettings): Promise<void> {
    write(SETTINGS_KEY, settings);
  }

  /** Sincroniza pestañas abiertas (ej. panel en una y tienda en otra). */
  subscribe(onChange: (name: CollectionName | "settings") => void): () => void {
    const handler = (e: StorageEvent) => {
      if (!e.key?.startsWith(PREFIX)) return;
      const name = e.key.slice(PREFIX.length) as CollectionName | "settings";
      if (name !== "settings") this.memory.delete(name);
      onChange(name);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  /** Borra todo lo guardado en este navegador y vuelve a los datos iniciales. */
  static resetAll() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("vdp:"))
      .forEach((k) => localStorage.removeItem(k));
  }
}
