/**
 * POST /api/veterinaria/orders
 * Crea un pedido (modo supabase). Recalcula TODO en el servidor con los
 * precios, cupones y stock de la base: el total que manda el navegador se ignora.
 * Con `{ dryRun: true }` devuelve solo la cotización (para validar cupones privados).
 */
import { INTEGRATIONS } from "@/lib/vet/config/integrations";
import { computeCart, type CartLine } from "@/lib/vet/domain/pricing";
import { applyStockMovement } from "@/lib/vet/domain/stock";
import { getCustomerTier } from "@/lib/vet/domain/loyalty";
import type { Order, OrderStatus, PaymentMethod } from "@/lib/vet/types";
import { adminRepo, badRequest, isValidName, isValidPhone, loadSettings, upsertCustomerByPhone } from "@/lib/vet/server/supabase-admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

const PAYMENTS: PaymentMethod[] = ["efectivo", "transferencia", "mercadopago", "tarjeta_local"];

export async function POST(req: Request) {
  if (INTEGRATIONS.dataSource !== "supabase") return badRequest("En modo demo los pedidos se procesan en el navegador.", 409);

  let body: {
    dryRun?: boolean;
    lines?: CartLine[];
    couponCode?: string;
    pointsToRedeem?: number;
    customer?: { name?: string; phone?: string; email?: string; marketingOptIn?: boolean };
    deliveryMethod?: Order["deliveryMethod"];
    zoneId?: string;
    address?: Order["address"];
    paymentMethod?: PaymentMethod;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return badRequest("Solicitud inválida");
  }

  const lines = (Array.isArray(body.lines) ? body.lines : [])
    .slice(0, 60)
    .map((l) => ({ productId: typeof l.productId === "string" ? l.productId : undefined, variantId: typeof l.variantId === "string" ? l.variantId : undefined, comboId: typeof l.comboId === "string" ? l.comboId : undefined, quantity: Math.max(0, Math.min(99, Math.floor(Number(l.quantity) || 0))) }))
    .filter((l) => l.quantity > 0 && (l.productId || l.comboId));
  if (!lines.length) return badRequest("El carrito está vacío");
  const deliveryMethod = body.deliveryMethod === "envio" ? "envio" : "retiro";

  const { repo } = adminRepo();
  const [products, combos, coupons, zones, settings, orders] = await Promise.all([
    repo.list("products"), repo.list("combos"), repo.list("coupons"), repo.list("shippingZones"), loadSettings(repo), repo.list("orders"),
  ]);

  const phoneDigits = (body.customer?.phone ?? "").replace(/\D/g, "").slice(-8);
  const customers = phoneDigits ? await repo.list("customers") : [];
  const existing = customers.find((c) => c.phone.replace(/\D/g, "").slice(-8) === phoneDigits);
  const previous = existing ? orders.filter((o) => o.customerId === existing.id && o.status !== "cancelado").length : 0;
  const tier = existing ? getCustomerTier(existing, orders, settings.loyalty) : settings.loyalty.tiers[0];
  const zone = zones.find((z) => z.id === body.zoneId && z.active) ?? null;

  const cart = computeCart({
    lines, products, combos, coupons, couponCode: body.couponCode, deliveryMethod, zone,
    shipping: settings.shipping, loyalty: settings.loyalty,
    customerPoints: existing?.points ?? 0, pointsToRedeem: Number(body.pointsToRedeem) || 0,
    previousOrders: previous, tier: tier?.id, pointsMultiplier: tier?.pointsMultiplier,
  });

  if (body.dryRun) return Response.json({ quote: { totals: cart.totals, couponError: cart.couponError, appliedCoupon: cart.appliedCoupon?.code, lines: cart.lines } });

  if (!isValidName(body.customer?.name) || !isValidPhone(body.customer?.phone)) return badRequest("Completá nombre y teléfono");
  if (!body.paymentMethod || !PAYMENTS.includes(body.paymentMethod)) return badRequest("Elegí un medio de pago");
  if (deliveryMethod === "envio" && !body.address?.street) return badRequest("Completá la dirección de entrega");
  if (cart.hasProblems) return badRequest(cart.lines.find((l) => !l.available)?.problem ?? "Revisá tu carrito", 409);
  if (body.couponCode && cart.couponError) return badRequest(cart.couponError, 409);

  let userId: string | undefined;
  try {
    const sb = await createServerSupabase();
    userId = (await sb.auth.getUser()).data.user?.id;
  } catch {
    /* compra sin cuenta */
  }
  const customer = await upsertCustomerByPhone(repo, { name: body.customer!.name!.trim(), phone: body.customer!.phone!.trim(), email: body.customer?.email, marketingOptIn: body.customer?.marketingOptIn, address: body.address }, userId);

  const now = new Date().toISOString();
  const status: OrderStatus = body.paymentMethod === "mercadopago" || body.paymentMethod === "transferencia" ? "pago_pendiente" : "nuevo";
  const orderRow = {
    id: `o_${crypto.randomUUID()}`,
    customer_id: customer.id,
    customer_name: customer.name,
    phone: customer.phone,
    email: customer.email ?? null,
    items: cart.lines.map(({ productId, variantId, comboId, name, variantLabel, unitPrice, quantity }) => ({ productId, variantId, comboId, name, variantLabel, unitPrice, quantity })),
    totals: cart.totals,
    coupon_code: cart.appliedCoupon?.code ?? null,
    payment_method: body.paymentMethod,
    delivery_method: deliveryMethod,
    shipping_zone_id: zone?.id ?? null,
    address: deliveryMethod === "envio" ? body.address : null,
    notes: body.notes?.toString().slice(0, 500) || null,
    status,
    status_history: [{ status, at: now }],
    source: "web",
  };
  const { client } = adminRepo();
  const { data: inserted, error } = await client.from("vet_orders").insert(orderRow).select("*").single();
  if (error) return badRequest(`No se pudo guardar el pedido: ${error.message}`, 500);

  // Stock, cupones y puntos canjeados.
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const l of cart.lines) {
    const p = l.productId ? byId.get(l.productId) : undefined;
    if (!p) continue;
    const tracked = l.variantId ? p.variants.find((v) => v.id === l.variantId)?.stock != null : p.stock != null;
    if (!tracked) continue;
    const { product, movement } = applyStockMovement(p, { type: "venta", quantity: -l.quantity, variantId: l.variantId, orderId: inserted.id, reason: `Pedido #${inserted.number}` }, `m_${crypto.randomUUID()}`);
    byId.set(p.id, product);
    await repo.upsert("products", product);
    await repo.upsert("stockMovements", movement);
  }
  for (const c of [cart.appliedCoupon, cart.automaticPromo]) if (c) await repo.upsert("coupons", { ...c, usedCount: c.usedCount + 1 });
  if (cart.totals.pointsRedeemed) await repo.upsert("customers", { ...customer, points: Math.max(0, customer.points - cart.totals.pointsRedeemed) });

  const { rowToItem } = await import("@/lib/vet/data/supabase-repository");
  return Response.json({ order: rowToItem<Order>(inserted) }, { status: 201 });
}
