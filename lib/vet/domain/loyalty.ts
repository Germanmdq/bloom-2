import type { Customer, LoyaltyReward, LoyaltySettings, LoyaltyTier, Order } from "../types";

export function computeLoyaltyPointsForAmount(amount: number, settings: LoyaltySettings, multiplier = 1): number {
  if (!settings.enabled || settings.amountPerStep <= 0) return 0;
  return Math.floor((Math.floor(amount / settings.amountPerStep) * settings.pointsPerStep) * multiplier);
}

/**
 * Nivel interno del cliente (NO es un ranking público: se usa solo para
 * asignar beneficios desde administración).
 */
export function getCustomerTier(customer: Pick<Customer, "id" | "tierOverride">, orders: Order[], settings: LoyaltySettings, now = new Date()): LoyaltyTier {
  const tiers = [...settings.tiers].sort((a, b) => a.minOrders - b.minOrders || a.minSpent - b.minSpent);
  if (customer.tierOverride) return tiers.find((t) => t.id === customer.tierOverride) ?? tiers[0];
  const since = now.getTime() - settings.windowDays * 86_400_000;
  const recent = orders.filter((o) => o.customerId === customer.id && o.status !== "cancelado" && new Date(o.createdAt).getTime() >= since);
  const spent = recent.reduce((s, o) => s + o.totals.total, 0);
  let current = tiers[0];
  for (const t of tiers) {
    if (recent.length >= t.minOrders && spent >= t.minSpent) current = t;
  }
  return current;
}

export interface RewardProgress {
  next: LoyaltyReward | null;
  missing: number;
  available: LoyaltyReward[];
  /** 0..1 hacia el próximo beneficio. */
  progress: number;
}

export function rewardProgress(points: number, rewards: LoyaltyReward[]): RewardProgress {
  const active = rewards.filter((r) => r.active).sort((a, b) => a.points - b.points);
  const available = active.filter((r) => r.points <= points);
  const next = active.find((r) => r.points > points) ?? null;
  const prevThreshold = available.length ? available[available.length - 1].points : 0;
  return {
    next,
    missing: next ? next.points - points : 0,
    available,
    progress: next ? Math.min(1, (points - prevThreshold) / Math.max(1, next.points - prevThreshold)) : 1,
  };
}

/** Descuento en pesos por canjear puntos directamente (si pointValue > 0). */
export function pointsToMoney(points: number, settings: LoyaltySettings): number {
  return Math.max(0, Math.floor(points * settings.pointValue));
}
