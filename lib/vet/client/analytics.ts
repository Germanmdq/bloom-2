"use client";
/**
 * Medición de eventos (productos vistos, carrito, compras, búsquedas,
 * WhatsApp, turnos, cupones…).
 *
 * Destinos:
 *  - Buffer local (últimos 3.000 eventos) → alimenta /veterinaria/admin/estadisticas en modo demo.
 *  - Google Analytics 4 (gtag) si se configura NEXT_PUBLIC_VET_GA_ID.
 *  - Supabase (tabla vet_events) en modo supabase.
 * Se pueden sumar más destinos con `addAnalyticsSink`.
 */
import type { AnalyticsEvent, AnalyticsEventName } from "../types";
import { INTEGRATIONS } from "../config/integrations";
import { uid } from "../domain/format";

const KEY = "vdp:events";
const MAX = 3000;

type Sink = (e: AnalyticsEvent) => void;
const sinks: Sink[] = [];

export function addAnalyticsSink(s: Sink) {
  sinks.push(s);
}

function sessionId(): string {
  try {
    let id = sessionStorage.getItem("vdp:sid");
    if (!id) {
      id = uid("s_");
      sessionStorage.setItem("vdp:sid", id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export function readLocalEvents(): AnalyticsEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

let queue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushToSupabase() {
  const batch = queue;
  queue = [];
  flushTimer = null;
  if (!batch.length) return;
  try {
    const { createClient } = await import("@/lib/supabase/client");
    await createClient()
      .from("vet_events")
      .insert(batch.map((e) => ({ id: e.id, name: e.name, props: e.props ?? {}, session_id: e.sessionId, customer_id: e.customerId ?? null, path: e.path ?? null, at: e.at })));
  } catch {
    /* la medición nunca debe romper la experiencia */
  }
}

export function track(name: AnalyticsEventName, props?: AnalyticsEvent["props"], customerId?: string) {
  if (typeof window === "undefined") return;
  const event: AnalyticsEvent = { id: uid("e_"), name, props, sessionId: sessionId(), customerId, path: location.pathname, at: new Date().toISOString() };
  try {
    const list = readLocalEvents();
    list.push(event);
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
  const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  if (gtag && INTEGRATIONS.googleAnalyticsId) gtag("event", name, props ?? {});
  if (INTEGRATIONS.dataSource === "supabase") {
    queue.push(event);
    if (!flushTimer) flushTimer = setTimeout(flushToSupabase, 3000);
  }
  sinks.forEach((s) => s(event));
}
