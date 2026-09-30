"use client";
/**
 * Estado de datos del cliente (navegador). Carga cada colección bajo demanda
 * desde el repositorio activo (demo o Supabase) y la mantiene sincronizada.
 */
import { useEffect } from "react";
import { create } from "zustand";
import type { VetSettings } from "../types";
import type { CollectionName, Collections, VetRepository } from "../data/repository";
import { INTEGRATIONS } from "../config/integrations";
import { LocalRepository } from "../data/local-repository";
import { mergeSettings } from "../data/settings";

let repo: VetRepository | null = null;
let unsubscribe: (() => void) | null = null;

export async function getRepository(): Promise<VetRepository> {
  if (repo) return repo;
  if (INTEGRATIONS.dataSource === "supabase") {
    const [{ createClient }, { SupabaseRepository }] = await Promise.all([import("@/lib/supabase/client"), import("../data/supabase-repository")]);
    repo = new SupabaseRepository(createClient());
  } else {
    repo = new LocalRepository((name) => import("../data/seed").then((m) => m.seedFor(name, true)));
  }
  return repo;
}

type DataMap = { [K in CollectionName]?: Collections[K][] };

interface VetDataState {
  data: DataMap;
  loading: Partial<Record<CollectionName, boolean>>;
  errors: Partial<Record<CollectionName, string>>;
  settings: VetSettings;
  settingsLoaded: boolean;
  ensure: (names: CollectionName[]) => Promise<void>;
  reload: (name: CollectionName) => Promise<void>;
  upsert: <K extends CollectionName>(name: K, item: Collections[K]) => Promise<Collections[K]>;
  upsertMany: <K extends CollectionName>(name: K, items: Collections[K][]) => Promise<void>;
  remove: (name: CollectionName, id: string) => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: (s: VetSettings) => Promise<void>;
}

const inflight = new Map<CollectionName, Promise<void>>();

export const useVetData = create<VetDataState>((set, get) => ({
  data: {},
  loading: {},
  errors: {},
  settings: mergeSettings(null),
  settingsLoaded: false,

  async ensure(names) {
    await Promise.all(
      names.map((name) => {
        if (get().data[name]) return Promise.resolve();
        if (!inflight.has(name)) {
          inflight.set(name, get().reload(name).finally(() => inflight.delete(name)));
        }
        return inflight.get(name)!;
      }),
    );
  },

  async reload(name) {
    set((s) => ({ loading: { ...s.loading, [name]: true } }));
    try {
      const r = await getRepository();
      startSync(r);
      const items = await r.list(name);
      set((s) => ({ data: { ...s.data, [name]: items }, loading: { ...s.loading, [name]: false }, errors: { ...s.errors, [name]: undefined } }));
    } catch (err) {
      set((s) => ({ loading: { ...s.loading, [name]: false }, errors: { ...s.errors, [name]: err instanceof Error ? err.message : String(err) } }));
    }
  },

  async upsert(name, item) {
    const id = (item as { id: string }).id;
    // Actualización optimista: la interfaz responde al instante.
    set((s) => {
      const list = (s.data[name] ?? []) as { id: string }[];
      const exists = list.some((x) => x.id === id);
      return { data: { ...s.data, [name]: exists ? list.map((x) => (x.id === id ? item : x)) : [item, ...list] } };
    });
    const r = await getRepository();
    return r.upsert(name, item);
  },

  async upsertMany(name, items) {
    set((s) => {
      const list = [...((s.data[name] ?? []) as { id: string }[])];
      const index = new Map(list.map((x, i) => [x.id, i]));
      for (const it of items as { id: string }[]) {
        const i = index.get(it.id);
        if (i != null) list[i] = it;
        else list.unshift(it);
      }
      return { data: { ...s.data, [name]: list } };
    });
    const r = await getRepository();
    await r.upsertMany(name, items);
  },

  async remove(name, id) {
    set((s) => ({ data: { ...s.data, [name]: ((s.data[name] ?? []) as { id: string }[]).filter((x) => x.id !== id) } }));
    const r = await getRepository();
    await r.remove(name, id);
  },

  async loadSettings() {
    const r = await getRepository();
    startSync(r);
    const stored = await r.getSettings().catch(() => ({}));
    set({ settings: mergeSettings(stored), settingsLoaded: true });
  },

  async saveSettings(s) {
    set({ settings: s });
    const r = await getRepository();
    await r.saveSettings(s);
  },
}));

function startSync(r: VetRepository) {
  if (unsubscribe || typeof window === "undefined" || !r.subscribe) return;
  unsubscribe = r.subscribe((name) => {
    const st = useVetData.getState();
    if (name === "settings") st.loadSettings();
    else if (st.data[name]) st.reload(name);
  });
}

/** Hook: devuelve una colección y la carga si hace falta. */
export function useCollection<K extends CollectionName>(name: K, enabled = true): { items: Collections[K][]; ready: boolean; error?: string } {
  const items = useVetData((s) => s.data[name]) as Collections[K][] | undefined;
  const error = useVetData((s) => s.errors[name]);
  const ensure = useVetData((s) => s.ensure);
  useEffect(() => {
    if (enabled) ensure([name]);
  }, [name, ensure, enabled]);
  return { items: items ?? EMPTY, ready: Boolean(items), error };
}
const EMPTY: never[] = [];

export function useSettings(): VetSettings {
  const settings = useVetData((s) => s.settings);
  const loaded = useVetData((s) => s.settingsLoaded);
  const load = useVetData((s) => s.loadSettings);
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);
  return settings;
}
