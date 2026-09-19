"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IconArrowLeft, IconCamera, IconChevronDown, IconChevronUp, IconUserCircle, IconCoffee, IconHome, IconLoader2, IconLock, IconChartPie, IconShoppingBag, IconTag, IconTrendingUp } from "@tabler/icons-react";
import { toast } from "sonner";

const COFFEE_GOAL = 10;
const GREEN = "#2d4a3e";
const GOLD = "#c9a84c";
const CREAM = "#FAF7F2";
const TEXT_DARK = "#1a1a1a";
const SIDEBAR_ACTIVE_BG = "rgba(255,255,255,0.08)";
const SIDEBAR_W = 240;

type SectionId = "inicio" | "pedidos" | "cupones" | "perfil" | "estadisticas";
type OrderFilter = "todos" | "mes" | "ano" | "deuda";

type OrderRow = {
  id: string;
  created_at: string;
  total: number | string;
  items: unknown;
  status?: string | null;
  paid?: boolean;
  customer_name?: string | null;
  order_type?: string | null;
  delivery_type?: string | null;
  cuenta_corriente?: boolean;
};

const COUPON_DEFS = [
  { id: "cafe", label: "Café gratis", unlock: 10, icon: "☕" },
] as const;

const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function dateKeyLocal(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loyaltyProgress(paidOrders: number) {
  const pos = paidOrders % COFFEE_GOAL;
  const filled = pos === 0 && paidOrders > 0 ? COFFEE_GOAL : pos;
  return { filled, pct: (filled / COFFEE_GOAL) * 100 };
}

function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function metaStr(u: User | null, key: string): string {
  const v = u?.user_metadata?.[key];
  return typeof v === "string" ? v.trim() : "";
}

function isBirthdayThisMonth(birthdate: string): boolean {
  const raw = birthdate.trim();
  if (raw.length < 7) return false;
  const d = new Date(raw.length >= 10 ? raw.slice(0, 10) : raw);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getMonth() === now.getMonth();
}

function orderItemsSummary(items: unknown, maxNames = 4): string {
  const arr = Array.isArray(items) ? items : [];
  if (arr.length === 0) return "Sin ítems";
  const names = arr
    .map((it) => String((it as { name?: string }).name ?? "").trim())
    .filter(Boolean);
  if (names.length === 0) return "Pedido";
  const shown = names.slice(0, maxNames);
  const more = names.length > maxNames ? ` +${names.length - maxNames}` : "";
  return `${shown.join(", ")}${more}`;
}

function orderTypeLabel(o: OrderRow): string {
  const d = String(o.delivery_type ?? "").toLowerCase();
  if (d === "delivery" || d === "domicilio") return "Delivery";
  return "Retiro";
}

function combineAddress(line: string, floor: string): string {
  const a = line.trim();
  const b = floor.trim();
  if (!a) return b;
  if (!b) return a;
  return `${a} - ${b}`;
}

function splitDefaultAddress(combined: string): { line: string; floor: string } {
  const t = combined.trim();
  const idx = t.indexOf(" - ");
  if (idx === -1) return { line: t, floor: "" };
  return { line: t.slice(0, idx).trim(), floor: t.slice(idx + 3).trim() };
}

function averageDaysBetweenOrders(datesIso: string[]): number {
  if (datesIso.length < 2) return 0;
  const ts = [...datesIso].map((d) => new Date(d).getTime()).sort((a, b) => a - b);
  let sum = 0;
  for (let i = 1; i < ts.length; i++) {
    sum += (ts[i] - ts[i - 1]) / (1000 * 60 * 60 * 24);
  }
  return Math.round((sum / (ts.length - 1)) * 10) / 10;
}

function orderStreakDays(orders: OrderRow[]): number {
  if (orders.length === 0) return 0;
  const keys = new Set(orders.map((o) => dateKeyLocal(o.created_at)));
  const newest = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  let d = new Date(newest.created_at);
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const k = dateKeyLocal(d.toISOString());
    if (keys.has(k)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

function modalHour(orders: OrderRow[]): number | null {
  const buckets = new Map<number, number>();
  for (const o of orders) {
    const h = new Date(o.created_at).getHours();
    buckets.set(h, (buckets.get(h) ?? 0) + 1);
  }
  let bestH: number | null = null;
  let bestC = 0;
  for (const [h, c] of buckets) {
    if (c > bestC) {
      bestC = c;
      bestH = h;
    }
  }
  return bestH;
}

const cardCls = "rounded-xl bg-white p-5 shadow-sm";
const statMiniCls = `${cardCls} flex flex-col`;

export default function CuentaPage() {
  const router = useRouter();
  const supabase = createClient();
  const sessionCheckedRef = useRef(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [sessionPending, setSessionPending] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [profile, setProfile] = useState<{ coffee_stamps: number; balance: number; birthday?: string; full_name?: string; customer_number?: string } | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [section, setSection] = useState<SectionId>("inicio");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("todos");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBirthdate, setEditBirthdate] = useState("");
  const [editAddressLine, setEditAddressLine] = useState("");
  const [editFloor, setEditFloor] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [debtPayMethod, setDebtPayMethod] = useState<'MERCADO_PAGO' | 'BANK_TRANSFER' | 'CASH'>('MERCADO_PAGO');

  const loadData = useCallback(
    async (uid: string) => {
      setOrdersLoading(true);
      const [listRes, profRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, created_at, total, items, status, paid, customer_name, order_type, delivery_type, cuenta_corriente")
          .eq("customer_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("coffee_stamps, balance, birthday, full_name, customer_number")
          .eq("id", uid)
          .single()
      ]);
      
      if (listRes.error) console.error(listRes.error);
      if (profRes.error) console.error(profRes.error);
      
      setOrders((listRes.data as OrderRow[]) ?? []);
      setProfile(profRes.data);
      // Si el nombre no estaba en user_metadata, tomarlo del perfil
      if (profRes.data?.full_name) {
        setEditFullName((prev) => prev || profRes.data!.full_name!);
      }
      setOrdersLoading(false);
    },
    [supabase]
  );

  const hydrateProfileFields = useCallback((u: User) => {
    setEditFullName(metaStr(u, "full_name") || metaStr(u, "name") || "");
    setEditPhone(metaStr(u, "phone") || (u.phone ?? "").trim());
    setEditBirthdate(metaStr(u, "birthdate"));
    const floorMeta = metaStr(u, "address_floor");
    const lineMeta = metaStr(u, "address_line");
    const combined = metaStr(u, "default_address");
    if (lineMeta || floorMeta) {
      setEditAddressLine(lineMeta || splitDefaultAddress(combined).line);
      setEditFloor(floorMeta || splitDefaultAddress(combined).floor);
    } else {
      const sp = splitDefaultAddress(combined);
      setEditAddressLine(sp.line);
      setEditFloor(sp.floor);
    }
    setAvatarUrl(metaStr(u, "avatar_url"));
  }, []);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      sessionCheckedRef.current = true;
      setSessionPending(false);
      if (!session?.user) {
        router.replace("/auth?redirect=/cuenta");
        return;
      }
      setUser(session.user);
      hydrateProfileFields(session.user);
      await loadData(session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!sessionCheckedRef.current) return;
      if (!session?.user) {
        router.replace("/auth?redirect=/cuenta");
        setUser(null);
        return;
      }
      setUser(session.user);
      hydrateProfileFields(session.user);
      void loadData(session.user.id);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router, supabase, loadData, hydrateProfileFields]);

  const displayName = editFullName.trim() || profile?.full_name?.trim() || metaStr(user, "full_name") || "Cliente Bloom";
  const customerNumber = profile?.customer_number || metaStr(user, "customer_number");
  const { filled: loyaltyFilled, pct: loyaltyPct } = loyaltyProgress(profile?.coffee_stamps || 0);
  const birthdayActive = isBirthdayThisMonth(editBirthdate);

  const analytics = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const totals = orders.map((o) => Number(o.total)).filter((n) => !Number.isNaN(n) && n > 0);
    const totalSpent = totals.reduce((a, b) => a + b, 0);
    const productCounts = new Map<string, number>();
    for (const o of orders) {
      const items = Array.isArray(o.items) ? o.items : [];
      for (const it of items) {
        const name = String((it as { name?: string }).name ?? "").trim();
        if (!name) continue;
        const q = Number((it as { quantity?: number }).quantity ?? 1);
        productCounts.set(name, (productCounts.get(name) ?? 0) + q);
      }
    }
    const top5 = [...productCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const ordersThisMonth = orders.filter((o) => new Date(o.created_at) >= startOfMonth);
    const ordersThisYear = orders.filter((o) => new Date(o.created_at) >= startOfYear);

    const byWeekday = WEEKDAY_LABELS.map((label, day) => ({ label, count: 0 }));
    const byHour = Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, "0")}:00`, count: 0 }));
    for (const o of orders) {
      const d = new Date(o.created_at);
      byWeekday[d.getDay()].count += 1;
      byHour[d.getHours()].count += 1;
    }

    const monthlySpend: { label: string; gasto: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const label = d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
      let gasto = 0;
      for (const o of orders) {
        const od = new Date(o.created_at);
        if (od.getFullYear() === y && od.getMonth() === m) {
          const t = Number(o.total);
          if (!Number.isNaN(t)) gasto += t;
        }
      }
      monthlySpend.push({ label, gasto });
    }

    const sortedDates = orders.map((o) => o.created_at).sort();
    const avgDaysBetween = averageDaysBetweenOrders(sortedDates);
    const streak = orderStreakDays(orders);

    let maxOrder = 0;
    let minOrder = Number.POSITIVE_INFINITY;
    for (const t of totals) {
      if (t > maxOrder) maxOrder = t;
      if (t < minOrder) minOrder = t;
    }
    if (minOrder === Number.POSITIVE_INFINITY) minOrder = 0;

    const mh = modalHour(orders);
    const horaFrecuente =
      mh === null ? "—" : `${String(mh).padStart(2, "0")}:00 – ${String(mh + 1).padStart(2, "0")}:00`;

    return {
      totalSpent,
      productCounts,
      top5,
      ordersThisMonth: ordersThisMonth.length,
      ordersThisYear: ordersThisYear.length,
      avgDaysBetween,
      byWeekday,
      byHour,
      monthlySpend,
      streak,
      maxOrder: maxOrder || 0,
      minOrder: minOrder === Number.POSITIVE_INFINITY ? 0 : minOrder,
      horaFrecuente,
      avgTicket: totals.length > 0 ? Math.round(totalSpent / totals.length) : 0,
    };
  }, [orders]);

  const overviewStats = useMemo(() => {
    let totalSum = 0;
    let nWithTotal = 0;
    const counts = new Map<string, number>();
    for (const o of orders) {
      const t = Number(o.total);
      if (!Number.isNaN(t) && t > 0) {
        totalSum += t;
        nWithTotal += 1;
      }
      const items = Array.isArray(o.items) ? o.items : [];
      for (const it of items) {
        const row = it as { name?: string; quantity?: number };
        const name = String(row.name ?? "").trim();
        if (!name) continue;
        const q = Number(row.quantity ?? 1);
        counts.set(name, (counts.get(name) ?? 0) + q);
      }
    }
    let topName = "—";
    let topN = 0;
    for (const [k, v] of counts) {
      if (v > topN) {
        topN = v;
        topName = k;
      }
    }
    return {
      totalOrdersCount: orders.length,
      averageOrderValue: nWithTotal > 0 ? Math.round(totalSum / nWithTotal) : 0,
      mostOrderedProduct: topN > 0 ? topName : "—",
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    if (orderFilter === "todos") return orders;
    if (orderFilter === "mes") return orders.filter((o) => new Date(o.created_at) >= startOfMonth);
    if (orderFilter === "deuda") return orders.filter((o) => !o.paid);
    return orders.filter((o) => new Date(o.created_at) >= startOfYear);
  }, [orders, orderFilter]);

  const pedidosListStats = useMemo(() => {
    const list = filteredOrders;
    const totals = list.map((o) => Number(o.total)).filter((t) => !Number.isNaN(t));
    const sum = totals.reduce((a, b) => a + b, 0);
    const n = totals.length;
    let maxT = 0;
    let minT = Number.POSITIVE_INFINITY;
    for (const t of totals) {
      if (t > maxT) maxT = t;
      if (t < minT) minT = t;
    }
    if (minT === Number.POSITIVE_INFINITY) minT = 0;
    const mh = modalHour(list);
    const hora =
      mh === null ? "—" : `${String(mh).padStart(2, "0")}:00 – ${String(mh + 1).padStart(2, "0")}:00`;
    return {
      totalGastado: sum,
      cantidad: list.length,
      promedio: n > 0 ? Math.round(sum / n) : 0,
      maxPedido: maxT,
      minPedido: minT,
      horaFrecuente: hora,
    };
  }, [filteredOrders]);

  const last3Orders = useMemo(() => orders.slice(0, 3), [orders]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const combined = combineAddress(editAddressLine, editFloor);
      const nextMeta = {
        ...(user.user_metadata ?? {}),
        full_name: editFullName.trim(),
        phone: editPhone.trim(),
        birthdate: editBirthdate.trim(),
        default_address: combined,
        address_line: editAddressLine.trim(),
        address_floor: editFloor.trim(),
        avatar_url: avatarUrl.trim() || "",
      };
      const emailNext = editEmail.trim();
      const payload: Parameters<typeof supabase.auth.updateUser>[0] = { data: nextMeta };
      if (emailNext && emailNext !== user.email) {
        payload.email = emailNext;
      }
      const { error: authErr } = await supabase.auth.updateUser(payload);
      if (authErr) throw authErr;

      await supabase.from("profiles").update({ full_name: editFullName.trim() }).eq("id", user.id);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        hydrateProfileFields(session.user);
      }
      toast.success("Perfil guardado");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDebtPayment = async (mode: 'TOTAL' | 'PARTIAL') => {
    if (!user || !profile) return;

    const amountToPay = mode === 'TOTAL' ? profile.balance : parseFloat(payAmount);

    if (!amountToPay || amountToPay < 10) {
        toast.error("Ingresá un monto válido (mínimo $10)");
        return;
    }

    if (amountToPay > profile.balance) {
        toast.error("El monto no puede superar la deuda total");
        return;
    }

    if (debtPayMethod !== 'MERCADO_PAGO') return;

    setIsPaying(true);
    try {
        const res = await fetch('/api/payments/create-preference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: [
                    {
                        id: `DEBT_PAYMENT_${user.id}_${Date.now()}`,
                        name: "Pago de Saldo Pendiente - Bloom Club",
                        unit_price: amountToPay,
                        quantity: 1
                    }
                ],
                metadata: {
                  type: 'DEBT_PAYMENT',
                  customer_id: user.id,
                  amount: amountToPay
                },
                external_reference: `DEBT_${user.id}_${Date.now()}`
            })
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Error al generar link de pago");

        if (result.init_point) {
            toast.info("Redirigiendo a Mercado Pago...");
            window.location.href = result.init_point;
        } else {
            throw new Error("No se recibió el punto de inicio de pago");
        }
    } catch (err: any) {
        toast.error(err.message);
    } finally {
        setIsPaying(false);
    }
  };

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Elegí un archivo de imagen");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 2 MB");
      return;
    }
    setAvatarBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(publicUrl);
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          ...(user.user_metadata ?? {}),
          avatar_url: publicUrl,
        },
      });
      if (authErr) throw authErr;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        hydrateProfileFields(session.user);
      }
      toast.success("Foto actualizada");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la foto");
    } finally {
      setAvatarBusy(false);
    }
  };

  const inputCls =
    "mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium outline-none transition placeholder:text-neutral-400 focus:border-[#2d4a3e] focus:ring-2 focus:ring-[#2d4a3e]/20";

  const navBtn = (id: SectionId, label: string, Icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>) => (
    <button
      key={id}
      type="button"
      onClick={() => setSection(id)}
      className={`flex w-full items-center gap-3 rounded-r-lg border-l-4 py-3 pl-4 pr-3 text-left text-[15px] font-semibold transition ${
        section === id ? "border-[#c9a84c] text-white" : "border-transparent text-white/90 hover:bg-white/5"
      }`}
      style={section === id ? { backgroundColor: SIDEBAR_ACTIVE_BG } : undefined}
      aria-current={section === id ? "page" : undefined}
    >
      <Icon className="h-5 w-5 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
      <span>{label}</span>
    </button>
  );

  const mobileNavBtn = (id: SectionId, label: string, Icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>) => (
    <button
      key={id}
      type="button"
      onClick={() => setSection(id)}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center py-2 ${section === id ? "text-[#c9a84c]" : "text-white/80"}`}
      aria-label={label}
    >
      <Icon className="h-6 w-6 shrink-0" strokeWidth={2} aria-hidden />
    </button>
  );

  if (sessionPending || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: CREAM }}>
        <IconLoader2 className="h-10 w-10 animate-spin" style={{ color: GREEN }} />
      </div>
    );
  }

  const memberSince =
    user.created_at != null
      ? new Date(user.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
      : "—";

  const profileTotalSpent = analytics.totalSpent;

  const SidebarBody = ({ mobile }: { mobile?: boolean }) => {
    if (mobile) {
      return (
        <nav className="flex min-w-0 flex-1 flex-row justify-around px-1">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex min-w-0 flex-1 flex-col items-center justify-center py-2 text-white"
            aria-label="Volver al inicio"
          >
            <IconArrowLeft className="h-6 w-6 shrink-0" strokeWidth={2} aria-hidden />
          </button>
          {mobileNavBtn("inicio", "Inicio", IconHome)}
          {mobileNavBtn("pedidos", "Mis pedidos", IconShoppingBag)}
          {mobileNavBtn("cupones", "Beneficios", IconTag)}
          {mobileNavBtn("perfil", "Mi perfil", IconUserCircle)}
          {mobileNavBtn("estadisticas", "Estadísticas", IconChartPie)}
        </nav>
      );
    }
    return (
      <>
        <div className="px-5 pt-8">
          <button onClick={() => router.push("/")} className="text-2xl font-black tracking-[-0.06em] text-white hover:opacity-80 transition-opacity">
            BLOOM.
          </button>
        </div>
        <div className="mt-8 flex flex-col items-center gap-2 px-4 text-center">
          <div
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-white/25"
            style={{ backgroundColor: "#1f352c" }}
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill className="object-cover" sizes="56px" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
                {initialsFromName(displayName)}
              </span>
            )}
          </div>
          <p className="line-clamp-2 w-full px-1 text-sm font-semibold leading-tight text-white">{displayName}</p>
          {customerNumber && (
            <p className="text-xs font-medium text-white/50">Nº socio: <span className="font-black text-white/80">{customerNumber}</span></p>
          )}
        </div>
        <nav className="mt-8 flex min-h-0 flex-1 flex-col gap-0.5 px-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-4 flex w-full items-center gap-3 rounded-r-lg border-l-4 border-transparent py-3 pl-4 pr-3 text-left text-[15px] font-semibold text-white/90 transition hover:bg-white/5"
          >
            <IconArrowLeft className="h-5 w-5 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
            <span>Volver al sitio</span>
          </button>

          {navBtn("inicio", "Inicio", IconHome)}
          {navBtn("pedidos", "Mis pedidos", IconShoppingBag)}
          {navBtn("cupones", "Beneficios", IconTag)}
          {navBtn("perfil", "Mi perfil", IconUserCircle)}
          {navBtn("estadisticas", "Estadísticas", IconChartPie)}
        </nav>
        <div className="min-h-0 flex-1" />
      </>
    );
  };

  const currentStamps = profile?.coffee_stamps || 0;

  const SectionInicio = () => (
    <div className="space-y-6">
      {customerNumber && (
        <div className="flex items-center justify-between rounded-2xl px-6 py-4 shadow-sm" style={{ backgroundColor: GREEN }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/50">Tu Nº de Socio</p>
            <p className="mt-1 text-3xl font-black tracking-[0.2em] text-white tabular-nums">{customerNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-white/50 leading-snug max-w-[140px]">Presentalo en el local para usar tus beneficios</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className={statMiniCls}>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Pedidos realizados</p>
          <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: TEXT_DARK }}>
            {overviewStats.totalOrdersCount}
          </p>
        </div>
        <div className={statMiniCls}>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Producto más pedido</p>
          <p className="mt-2 text-lg font-bold leading-snug" style={{ color: TEXT_DARK }}>
            {overviewStats.mostOrderedProduct}
          </p>
        </div>
        <div className={statMiniCls}>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Pedidos este mes</p>
          <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: TEXT_DARK }}>
            {analytics.ordersThisMonth}
          </p>
        </div>
        <div className={statMiniCls}>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Pedidos este año</p>
          <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: TEXT_DARK }}>
            {analytics.ordersThisYear}
          </p>
        </div>
        <div className={statMiniCls}>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Promedio días entre pedidos</p>
          <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: TEXT_DARK }}>
            {orders.length >= 2 ? analytics.avgDaysBetween : "—"}
          </p>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="flex items-center gap-2 text-base font-bold" style={{ color: TEXT_DARK }}>
          <IconCoffee className="h-5 w-5" style={{ color: GREEN }} aria-hidden />
          Club Bloom — Tu Fidelidad
        </h2>
        <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-neutral-600">
                {currentStamps} / {COFFEE_GOAL} cafés acumulados
            </p>
            {currentStamps === COFFEE_GOAL && (
                <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-600 px-2 py-1 rounded-md animate-pulse">¡PRÓXIMO GRATIS!</span>
            )}
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (currentStamps / COFFEE_GOAL) * 100)}%`, backgroundColor: GREEN }} />
        </div>
        <p className="mt-3 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
            Cada 10 cafés, el 11º va sin cargo. Válido para Café, Café con leche y promos con facturas.
        </p>
      </div>

      {profile && profile.balance > 0 && (
        <div className={`${cardCls} border-2 border-emerald-200 bg-emerald-50 shadow-emerald-100 overflow-hidden`}>
            <div className="flex items-center justify-between gap-4 p-5 pb-0">
                <div className="flex-1">
                    <h2 className="flex items-center gap-2 text-base font-black text-emerald-900 leading-none mb-1.5">
                        <IconTrendingUp className="h-5 w-5 text-emerald-600" />
                        Saldo Pendiente
                    </h2>
                    <p className="text-sm text-emerald-800 leading-snug font-medium mb-2">
                        Tenés un saldo pendiente de pago de <strong>{formatMoney(profile.balance)}</strong>. 
                    </p>
                    <button 
                        onClick={() => setSection("pedidos")}
                        className="text-xs font-bold uppercase tracking-wider text-emerald-700 underline underline-offset-4 hover:text-emerald-900 transition-colors"
                    >
                        Ver detalle de pedidos
                    </button>
                </div>
                <div className="text-right whitespace-nowrap">
                    <p className="text-2xl font-black text-emerald-600 leading-none">-{formatMoney(profile.balance)}</p>
                </div>
            </div>

            {/* Payment Form */}
            <div className="mt-5 border-t border-emerald-100 bg-white/50 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-3">Medio de Pago</p>

                {/* Method selector */}
                <div className="flex gap-2 mb-4">
                    {([
                        { id: 'MERCADO_PAGO', label: 'Mercado Pago', emoji: '📱' },
                        { id: 'BANK_TRANSFER', label: 'Transferencia', emoji: '🏦' },
                        { id: 'CASH', label: 'Efectivo', emoji: '💵' },
                    ] as const).map(m => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => setDebtPayMethod(m.id)}
                            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                                debtPayMethod === m.id
                                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                                    : 'border-emerald-100 bg-white text-emerald-700 hover:border-emerald-300'
                            }`}
                        >
                            <span className="text-base leading-none">{m.emoji}</span>
                            {m.label}
                        </button>
                    ))}
                </div>

                {/* Mercado Pago flow */}
                {debtPayMethod === 'MERCADO_PAGO' && (
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Monto a pagar..."
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                                className="flex-1 h-12 px-4 rounded-xl border border-emerald-100 bg-white font-bold text-sm outline-none focus:ring-2 ring-emerald-500/20 transition-all"
                            />
                            <button
                                disabled={isPaying}
                                onClick={() => handleDebtPayment('TOTAL')}
                                className="h-12 px-6 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                                Pagar Total
                            </button>
                        </div>
                        <button
                            disabled={isPaying || !payAmount}
                            onClick={() => handleDebtPayment('PARTIAL')}
                            className="w-full h-12 bg-white border-2 border-emerald-600 text-emerald-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:border-emerald-200 disabled:text-emerald-200"
                        >
                            {isPaying ? 'Procesando...' : 'Pagar Monto Parcial'}
                        </button>
                        <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter text-center italic">
                            Serás redirigido a Mercado Pago para completar la operación.
                        </p>
                    </div>
                )}

                {/* Bank transfer info */}
                {debtPayMethod === 'BANK_TRANSFER' && (
                    <div className="rounded-xl border border-emerald-100 bg-white p-4 space-y-2">
                        <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Datos para transferencia</p>
                        <div className="space-y-1 text-sm font-bold text-gray-800">
                            <p>Alias: <span className="font-black text-emerald-700 select-all">bloom.cafe</span></p>
                            <p>Banco: Mercado Pago</p>
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium leading-snug mt-2">
                            Una vez realizada la transferencia, avisanos por WhatsApp con el comprobante para que acreditemos el pago en tu cuenta.
                        </p>
                    </div>
                )}

                {/* Cash info */}
                {debtPayMethod === 'CASH' && (
                    <div className="rounded-xl border border-emerald-100 bg-white p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-emerald-700 mb-2">Pago en efectivo</p>
                        <p className="text-sm font-medium text-gray-700 leading-snug">
                            Acercate al local y aboná en efectivo. El saldo se actualiza en el momento.
                        </p>
                        <p className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            También podés avisarnos por WhatsApp para coordinar.
                        </p>
                    </div>
                )}
            </div>
        </div>
      )}

      {birthdayActive && (
        <div className={`${cardCls} border-2 border-amber-200 bg-amber-50 shadow-amber-100`}>
            <h2 className="flex items-center gap-2 text-base font-bold text-amber-900">
                🎂 ¡Regalo de Cumpleaños!
            </h2>
            <p className="mt-2 text-sm text-amber-800 leading-snug">
                Como es tu mes, tenés un **Café con Medialunas** de regalo en tu próxima visita al local. ¡Vení a festejar con nosotros!
            </p>
        </div>
      )}

      <div className={cardCls}>
        <h2 className="text-base font-bold" style={{ color: TEXT_DARK }}>
          Últimos pedidos
        </h2>
        {last3Orders.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600">Todavía no tenés pedidos.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100">
            {last3Orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="text-neutral-700">
                  {new Date(o.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}{" "}
                  <span className="text-neutral-500">{orderItemsSummary(o.items, 3)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const SectionPedidos = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["todos", "Todos"],
            ["mes", "Este mes"],
            ["ano", "Este año"],
            ["deuda", "Pendientes"],
          ] as const
        ).map(([key, lab]) => (
          <button
            key={key}
            type="button"
            onClick={() => setOrderFilter(key)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              orderFilter === key ? "text-white" : "bg-white text-neutral-700 shadow-sm"
            }`}
            style={orderFilter === key ? { backgroundColor: GREEN } : undefined}
          >
            {lab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
        {[
          ["Cantidad", String(pedidosListStats.cantidad)],
          ["Hora más frecuente", pedidosListStats.horaFrecuente],
        ].map(([k, v]) => (
          <div key={k} className={statMiniCls}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{k}</p>
            <p className="mt-1 break-words text-sm font-bold" style={{ color: TEXT_DARK }}>
              {v}
            </p>
          </div>
        ))}
      </div>

      <div className={cardCls + " overflow-hidden p-0"}>
        {ordersLoading ? (
          <div className="flex justify-center py-16">
            <IconLoader2 className="h-8 w-8 animate-spin" style={{ color: GREEN }} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-600">No hay pedidos en este filtro.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Ítems</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="w-10 px-2 py-3" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o, idx) => {
                  const paid = Boolean(o.paid);
                  const openQ = expandedOrderId === o.id;
                  const items = Array.isArray(o.items) ? o.items : [];
                  const summary = orderItemsSummary(o.items);
                  return (
                    <Fragment key={o.id}>
                      <tr className={idx % 2 === 0 ? "bg-white" : "bg-neutral-50/80"}>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-neutral-800">
                          {new Date(o.created_at).toLocaleString("es-AR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="max-w-[200px] px-4 py-3 text-neutral-700">
                          <span className="line-clamp-2">{summary}</span>
                        </td>
                        <td className="px-4 py-3 text-neutral-700">{orderTypeLabel(o)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase w-fit ${paid ? "text-white" : "bg-amber-100 text-amber-900"}`}
                              style={paid ? { backgroundColor: GREEN } : undefined}
                            >
                              {paid ? "Pagado" : "Pendiente"}
                            </span>
                            {o.cuenta_corriente && !paid && (
                              <span className="text-[9px] font-black uppercase text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md w-fit">
                                A cuenta
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={() => setExpandedOrderId(openQ ? null : o.id)}
                            className="flex rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"
                            aria-expanded={openQ}
                            aria-label={openQ ? "Cerrar detalle" : "Ver detalle"}
                          >
                            {openQ ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                          </button>
                        </td>
                      </tr>
                      {openQ ? (
                        <tr className={idx % 2 === 0 ? "bg-white" : "bg-neutral-50/80"}>
                          <td colSpan={6} className="px-4 pb-4 pt-0">
                            <ul className="mt-2 space-y-1 rounded-lg bg-neutral-100/80 p-3 text-sm">
                              {items.length === 0 ? (
                                <li className="text-neutral-500">Sin detalle</li>
                              ) : (
                                items.map((it: unknown, i: number) => {
                                  const row = it as { name?: string; quantity?: number; price?: number };
                                  return (
                                    <li key={i} className="flex justify-between gap-2">
                                      <span>
                                        {(row.quantity ?? 1) > 1 && <strong>{row.quantity}× </strong>}
                                        {row.name}
                                      </span>
                                      <span className="tabular-nums">
                                        {formatMoney(Number(row.price ?? 0) * Number(row.quantity ?? 1))}
                                      </span>
                                    </li>
                                  );
                                })
                              )}
                            </ul>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const SectionCupones = () => (
    <div className="space-y-6">
      {/* Resumen del programa */}
      <div
        className="rounded-2xl p-6 shadow-sm"
        style={{ background: `linear-gradient(135deg, ${GREEN} 0%, #1f352c 100%)` }}
      >
        <p className="text-sm font-semibold text-white/70">Tus beneficios</p>
        <p className="mt-1 text-3xl font-black text-white tabular-nums">
            {currentStamps} cafés registrados
        </p>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${Math.min((currentStamps / COFFEE_GOAL) * 100, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-white/50">
          {currentStamps < COFFEE_GOAL
            ? `Te faltan ${COFFEE_GOAL - currentStamps} cafés para tu próxima recompensa`
            : "¡Próximo café sin cargo!"}
        </p>
      </div>

      {/* Cupón de cumpleaños */}
      {birthdayActive && (
        <div
          className="flex items-center gap-4 rounded-2xl p-5 shadow-sm"
          style={{ background: `linear-gradient(135deg, ${GOLD}f0 0%, #e8d48a 100%)` }}
        >
          <span className="text-4xl">🎂</span>
          <div>
            <p className="text-base font-black" style={{ color: TEXT_DARK }}>
              ¡Es tu mes de cumpleaños!
            </p>
            <p className="mt-0.5 text-sm font-medium opacity-80" style={{ color: TEXT_DARK }}>
              Reclamá tu café con medialunas de regalo en el local
            </p>
          </div>
        </div>
      )}

      {/* Grid de beneficios */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {COUPON_DEFS.map((c) => {
          const unlocked = currentStamps >= c.unlock;
          const progress = Math.min(currentStamps / c.unlock, 1);
          if (unlocked) {
            return (
              <div
                key={c.id}
                className="rounded-2xl p-5 shadow-sm"
                style={{ background: `linear-gradient(135deg, ${GOLD}e8 0%, #d4af37 55%, ${GOLD} 100%)` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-3xl">{c.icon}</span>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-black"
                    style={{ backgroundColor: "rgba(255,255,255,0.4)", color: TEXT_DARK }}
                  >
                    ¡LISTO!
                  </span>
                </div>
                <p className="mt-3 text-lg font-black" style={{ color: TEXT_DARK }}>
                  {c.label}
                </p>
                <p className="mt-1 text-xs font-semibold" style={{ color: TEXT_DARK, opacity: 0.7 }}>
                  Presentá esta pantalla en el local para usarlo
                </p>
              </div>
            );
          }
          return (
            <div key={c.id} className={`${cardCls}`}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-2xl">
                  {c.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black" style={{ color: TEXT_DARK }}>
                    {c.label}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Acumulá {c.unlock} cafés para desbloquearlo
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${progress * 100}%`, backgroundColor: GREEN }}
                      />
                    </div>
                    <span className="text-xs font-bold tabular-nums text-neutral-500">
                      {currentStamps}/{c.unlock}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const SectionPerfil = () => {
    return (
      <div className="space-y-6">
        <div className={cardCls}>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => void onAvatarFile(e)}
          />
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarBusy}
              className="group relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-md outline-none ring-2 ring-neutral-200 transition hover:ring-[#c9a84c] disabled:opacity-60"
              style={{ backgroundColor: GREEN }}
            >
              {avatarUrl ? (
                <Image src={avatarUrl} alt={displayName} fill className="object-cover" sizes="112px" />
              ) : (
                <span className="text-3xl font-black text-white">{initialsFromName(displayName)}</span>
              )}
              <span className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 to-transparent pb-2 opacity-0 transition group-hover:opacity-100">
                {avatarBusy ? <IconLoader2 className="h-6 w-6 animate-spin text-white" /> : <IconCamera className="h-5 w-5 text-white" />}
              </span>
            </button>
            <div className="min-w-0 flex-1 space-y-4">
              <p className="text-sm text-neutral-500">Tocá la foto para cambiarla</p>
              <div>
                <label htmlFor="pf-name" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Nombre
                </label>
                <input id="pf-name" className={inputCls} value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="pf-phone" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Teléfono
                </label>
                <input id="pf-phone" className={inputCls} inputMode="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
              {customerNumber && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Nº de Socio</label>
                  <div className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xl font-black tracking-[0.2em] tabular-nums" style={{ color: GREEN }}>
                    {customerNumber}
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-400">Usá este número junto con tu teléfono para ingresar</p>
                </div>
              )}
              <div>
                <label htmlFor="pf-bd" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Fecha de nacimiento
                </label>
                <input
                  id="pf-bd"
                  type="date"
                  className={inputCls}
                  value={editBirthdate.length >= 10 ? editBirthdate.slice(0, 10) : editBirthdate}
                  onChange={(e) => setEditBirthdate(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="pf-addr" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Dirección
                </label>
                <input id="pf-addr" className={inputCls} value={editAddressLine} onChange={(e) => setEditAddressLine(e.target.value)} />
              </div>
              <div>
                <label htmlFor="pf-floor" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Piso / Dpto
                </label>
                <input id="pf-floor" className={inputCls} value={editFloor} onChange={(e) => setEditFloor(e.target.value)} />
              </div>
              <button
                type="button"
                onClick={() => void saveProfile()}
                disabled={savingProfile}
                className="flex min-h-12 items-center justify-center rounded-full px-8 text-sm font-bold text-white shadow-sm disabled:opacity-60"
                style={{ backgroundColor: GREEN }}
              >
                {savingProfile ? <IconLoader2 className="h-5 w-5 animate-spin" /> : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {customerNumber && (
            <div className={statMiniCls}>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Nº de socio</p>
              <p className="mt-2 text-2xl font-black tabular-nums tracking-widest" style={{ color: GREEN }}>
                {customerNumber}
              </p>
            </div>
          )}
          <div className={statMiniCls}>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Miembro desde</p>
            <p className="mt-2 font-bold" style={{ color: TEXT_DARK }}>
              {memberSince}
            </p>
          </div>
          <div className={statMiniCls}>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Total pedidos</p>
            <p className="mt-2 text-2xl font-bold tabular-nums" style={{ color: TEXT_DARK }}>
              {orders.length}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const chartWrap = "h-72 w-full min-w-0";

  const SectionEstadisticas = () => (
    <div className="space-y-6">
      <div className={cardCls}>
        <h3 className="text-sm font-bold" style={{ color: TEXT_DARK }}>
          Pedidos por día de la semana
        </h3>
        <div className={chartWrap}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.byWeekday} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip />
              <Bar dataKey="count" fill={GREEN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={cardCls}>
        <h3 className="text-sm font-bold" style={{ color: TEXT_DARK }}>
          Pedidos por hora del día
        </h3>
        <div className={chartWrap}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.byHour} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip />
              <Bar dataKey="count" fill={GREEN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={cardCls}>
        <h3 className="text-sm font-bold" style={{ color: TEXT_DARK }}>
          Top 5 productos
        </h3>
        {analytics.top5.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600">Sin datos todavía.</p>
        ) : (
          <ol className="mt-4 space-y-2">
            {analytics.top5.map((p, i) => (
              <li key={p.name} className="flex justify-between gap-2 text-sm">
                <span className="text-neutral-700">
                  {i + 1}. {p.name}
                </span>
                <span className="font-bold tabular-nums text-neutral-900">{p.count}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className={statMiniCls}>
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Racha actual</p>
        <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: TEXT_DARK }}>
          {analytics.streak} {analytics.streak === 1 ? "día" : "días"} seguidos con pedido
        </p>
        <p className="mt-1 text-xs text-neutral-500">Contando desde tu último pedido hacia atrás, días consecutivos calendario.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans antialiased" style={{ backgroundColor: CREAM, color: TEXT_DARK }}>
      <aside
        className="fixed left-0 top-0 z-30 hidden h-screen w-[240px] flex-col border-r border-white/10 lg:flex"
        style={{ width: SIDEBAR_W, backgroundColor: GREEN }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <SidebarBody />
        </div>
      </aside>

      <div className="pb-20 lg:ml-[240px] lg:pb-10">
        {/* Barra superior con flecha para volver atrás */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#c4b896]/20 bg-[#FAF7F2]/95 px-4 py-3 backdrop-blur-md lg:px-10">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[#1a3028] shadow-sm border border-[#c4b896]/30 hover:bg-[#edeae0] transition-all active:scale-95 cursor-pointer"
          >
            <IconArrowLeft className="h-4 w-4" strokeWidth={2.5} />
            <span>Volver al Menú</span>
          </button>
          <span className="font-extrabold text-sm text-[#1a3028] lg:hidden">Mi Cuenta</span>
          <div className="w-10 lg:hidden" />
        </div>

        <main className="mx-auto max-w-5xl px-4 py-6 lg:px-10 lg:py-10">
          <h1 className="mb-6 text-xl font-black lg:text-2xl" style={{ color: TEXT_DARK }}>
            {section === "inicio" && "Inicio"}
            {section === "pedidos" && "Mis pedidos"}
            {section === "cupones" && "Beneficios"}
            {section === "perfil" && "Mi perfil"}
            {section === "estadisticas" && "Estadísticas"}
          </h1>
          {section === "inicio" && <SectionInicio />}
          {section === "pedidos" && <SectionPedidos />}
          {section === "cupones" && <SectionCupones />}
          {section === "perfil" && <SectionPerfil />}
          {section === "estadisticas" && <SectionEstadisticas />}
        </main>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-stretch border-t border-white/10 lg:hidden"
        style={{ backgroundColor: GREEN }}
      >
        <SidebarBody mobile />
      </div>
    </div>
  );
}
