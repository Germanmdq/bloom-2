/**
 * DATOS DE DEMOSTRACIÓN (ficticios).
 *
 * Clientes, mascotas, pedidos, turnos, reseñas, cupones y combos de EJEMPLO
 * para poder recorrer toda la aplicación antes de tener datos reales.
 * Todo lleva `demo: true` y se puede borrar con un clic desde
 * /veterinaria/admin/configuracion → "Borrar datos de ejemplo".
 *
 * Los productos y precios usados en los pedidos SÍ son del catálogo real;
 * los pedidos en sí son simulados.
 */
import type {
  AbandonedCart,
  Appointment,
  Combo,
  Coupon,
  Customer,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Pet,
  Product,
  Review,
  Service,
  Species,
  WaitlistEntry,
} from "../types";
import { computeLoyaltyPointsForAmount } from "../domain/loyalty";
import { DEFAULT_SETTINGS } from "../catalog/settings";
import { toDateKey, addDays } from "../domain/dates";

/** PRNG determinístico (mulberry32) para que la demo sea estable. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Laura", "Martín", "Sofía", "Diego", "Valentina", "Lucas", "Camila", "Julián", "Florencia", "Nicolás", "Agustina", "Tomás", "Paula", "Federico"];
const LAST = ["Gómez", "Fernández", "López", "Martínez", "Pérez", "Romero", "Sosa", "Díaz", "Álvarez", "Ruiz", "Torres", "Acosta", "Benítez", "Molina"];
const PETS: { name: string; species: Species; breed: string; sex: Pet["sex"] }[] = [
  { name: "Toby", species: "perro", breed: "Caniche", sex: "macho" },
  { name: "Luna", species: "perro", breed: "Mestiza", sex: "hembra" },
  { name: "Mishi", species: "gato", breed: "Europeo común", sex: "hembra" },
  { name: "Rocco", species: "perro", breed: "Bulldog francés", sex: "macho" },
  { name: "Nala", species: "gato", breed: "Siamés", sex: "hembra" },
  { name: "Simón", species: "perro", breed: "Golden retriever", sex: "macho" },
  { name: "Kiara", species: "perro", breed: "Shih Tzu", sex: "hembra" },
  { name: "Pelusa", species: "conejo", breed: "Belier", sex: "hembra" },
  { name: "Milo", species: "gato", breed: "Mestizo", sex: "macho" },
  { name: "Olivia", species: "perro", breed: "Schnauzer", sex: "hembra" },
  { name: "Pipo", species: "ave", breed: "Cotorra", sex: "macho" },
  { name: "Bruno", species: "perro", breed: "Labrador", sex: "macho" },
  { name: "Chispa", species: "perro", breed: "Yorkshire", sex: "hembra" },
  { name: "Tito", species: "pequenos", breed: "Hámster", sex: "macho" },
  { name: "Lola", species: "gato", breed: "Persa", sex: "hembra" },
  { name: "Max", species: "perro", breed: "Border collie", sex: "macho" },
];

export interface DemoDataset {
  customers: Customer[];
  pets: Pet[];
  orders: Order[];
  appointments: Appointment[];
  waitlist: WaitlistEntry[];
  carts: AbandonedCart[];
  reviews: Review[];
  coupons: Coupon[];
  combos: Combo[];
}

export function generateDemoData(products: Product[], services: Service[], now = new Date()): DemoDataset {
  const rand = rng(20260930);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const iso = (d: Date) => d.toISOString();
  const daysAgo = (n: number, hour = 12) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    d.setHours(hour, Math.floor(rand() * 60), 0, 0);
    return d;
  };

  // ── Clientes
  const customers: Customer[] = FIRST.slice(0, 12).map((first, i) => {
    const created = daysAgo(Math.floor(rand() * 170) + (i < 3 ? 0 : 20));
    return {
      id: `demo-c${i + 1}`,
      name: `${first} ${LAST[i]}`,
      phone: `+54 9 11 0000-${String(1000 + i * 37).slice(-4)}`,
      email: `cliente${i + 1}@ejemplo.com`,
      address: { street: "Calle de ejemplo", number: String(100 + i * 11), city: "Ciudad de ejemplo" },
      points: 0,
      favoriteIds: [],
      marketingOptIn: i % 3 !== 0,
      demo: true,
      createdAt: iso(created),
      updatedAt: iso(created),
    };
  });

  // ── Mascotas (algunas con cumpleaños hoy / esta semana para mostrar campañas)
  const pets: Pet[] = PETS.map((p, i) => {
    const owner = customers[i % customers.length];
    const birth = new Date(now);
    birth.setFullYear(now.getFullYear() - (1 + Math.floor(rand() * 10)));
    if (i === 0) {
      // Toby cumple años hoy.
    } else if (i === 3) {
      birth.setDate(birth.getDate() + 3);
    } else {
      birth.setMonth(Math.floor(rand() * 12), 1 + Math.floor(rand() * 27));
    }
    return {
      id: `demo-p${i + 1}`,
      customerId: owner.id,
      name: p.name,
      species: p.species,
      breed: p.breed,
      sex: p.sex,
      birthDate: i % 5 === 4 ? undefined : toDateKey(birth),
      approxAgeYears: i % 5 === 4 ? 3 : undefined,
      weightKg: p.species === "perro" ? Math.round((4 + rand() * 30) * 10) / 10 : p.species === "gato" ? Math.round((3 + rand() * 3) * 10) / 10 : undefined,
      notes: i === 1 ? "Se pone nerviosa con el secador." : undefined,
      demo: true,
      createdAt: owner.createdAt,
      updatedAt: owner.createdAt,
    };
  });

  // ── Pedidos (productos y precios reales del catálogo, pedidos simulados)
  const sellable = products.filter((p) => p.visible && !p.requiresConsultation && (p.price != null || p.variants.some((v) => v.price != null)));
  const statuses: OrderStatus[] = ["entregado", "entregado", "entregado", "entregado", "pagado", "cancelado"];
  const payments: PaymentMethod[] = ["efectivo", "transferencia", "mercadopago", "tarjeta_local"];
  const orders: Order[] = [];
  let number = 1001;
  for (let day = 59; day >= 0; day--) {
    const perDay = day < 7 ? 1 + Math.floor(rand() * 3) : Math.floor(rand() * 3);
    for (let k = 0; k < perDay; k++) {
      const customer = rand() < 0.85 ? pick(customers) : undefined;
      const itemCount = 1 + Math.floor(rand() * 3);
      const items: OrderItem[] = [];
      for (let j = 0; j < itemCount; j++) {
        const p = pick(sellable);
        const variant = p.variants.length ? pick(p.variants.filter((v) => v.price != null)) : undefined;
        const unitPrice = variant?.price ?? p.price!;
        if (items.some((it) => it.productId === p.id)) continue;
        items.push({ productId: p.id, variantId: variant?.id, name: p.name, variantLabel: variant?.label, unitPrice, quantity: 1 + Math.floor(rand() * 2) });
      }
      const subtotal = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
      const created = daysAgo(day, 9 + Math.floor(rand() * 11));
      let status: OrderStatus = pick(statuses);
      if (day === 0) status = pick<OrderStatus>(["nuevo", "pago_pendiente", "preparando", "listo_retirar"]);
      if (day === 1) status = pick<OrderStatus>(["preparando", "en_camino", "entregado"]);
      const delivery = rand() < 0.55 ? "retiro" : "envio";
      orders.push({
        id: `demo-o${number}`,
        number,
        customerId: customer?.id,
        customerName: customer?.name ?? "Cliente sin cuenta (ejemplo)",
        phone: customer?.phone ?? "+54 9 11 0000-0000",
        items,
        totals: {
          subtotal,
          discount: 0,
          shipping: delivery === "envio" ? null : 0,
          total: subtotal,
          pointsEarned: status === "cancelado" ? 0 : computeLoyaltyPointsForAmount(subtotal, DEFAULT_SETTINGS.loyalty),
          pointsRedeemed: 0,
        },
        paymentMethod: pick(payments),
        deliveryMethod: delivery,
        address: delivery === "envio" ? customer?.address ?? { street: "Calle de ejemplo", number: "123" } : undefined,
        status,
        statusHistory: [{ status: "nuevo", at: iso(created) }, ...(status !== "nuevo" ? [{ status, at: iso(created) }] : [])],
        source: "web",
        demo: true,
        createdAt: iso(created),
        updatedAt: iso(created),
      });
      number++;
    }
  }
  for (const c of customers) {
    c.points = orders.filter((o) => o.customerId === c.id).reduce((s, o) => s + o.totals.pointsEarned, 0);
    c.favoriteIds = [pick(sellable).id, pick(sellable).id].filter((v, i, a) => a.indexOf(v) === i);
  }

  // ── Turnos (pasados y próximos)
  const visibleServices = services.filter((s) => s.visible);
  const appointments: Appointment[] = [];
  let ap = 1;
  for (let offset = -20; offset <= 12; offset++) {
    const date = addDays(now, offset);
    const dow = date.getDay();
    if (dow === 0) continue;
    const count = offset >= 0 && offset <= 2 ? 3 : Math.floor(rand() * 3);
    const usedTimes = new Set<string>();
    for (let k = 0; k < count; k++) {
      const service = pick(visibleServices);
      const hour = pick([9, 10, 11, 12, 16, 17, 18, 19]);
      const time = `${String(hour).padStart(2, "0")}:00`;
      if (usedTimes.has(time)) continue;
      usedTimes.add(time);
      const pet = pick(pets);
      const owner = customers.find((c) => c.id === pet.customerId)!;
      const status: Appointment["status"] =
        offset < 0 ? (rand() < 0.85 ? "completado" : pick(["cancelado", "ausente"] as const)) : offset === 0 ? "confirmado" : rand() < 0.6 ? "confirmado" : "pendiente";
      appointments.push({
        id: `demo-a${ap++}`,
        serviceId: service.id,
        customerId: owner.id,
        petId: pet.id,
        customerName: owner.name,
        phone: owner.phone,
        petName: pet.name,
        date: toDateKey(date),
        time,
        durationMin: service.durationMin,
        price: service.price,
        status,
        source: "web",
        createdAt: iso(daysAgo(Math.max(0, -offset) + 2)),
        updatedAt: iso(daysAgo(Math.max(0, -offset))),
      });
    }
  }

  const waitlist: WaitlistEntry[] = [
    { id: "demo-w1", name: customers[4].name, phone: customers[4].phone, petName: "Nala", serviceId: "bano", preferredDate: toDateKey(addDays(now, 2)), preferredTime: "10:00", status: "esperando", createdAt: iso(daysAgo(1)) },
    { id: "demo-w2", name: customers[7].name, phone: customers[7].phone, petName: "Simón", serviceId: "peluqueria", preferredDate: toDateKey(addDays(now, 5)), preferredTime: "17:00", status: "esperando", createdAt: iso(daysAgo(0)) },
  ];

  const carts: AbandonedCart[] = [0, 1, 2].map((i) => {
    const p = sellable[(i * 17) % sellable.length];
    const price = p.price ?? p.variants.find((v) => v.price != null)?.price ?? 0;
    const c = customers[i + 2];
    return {
      id: `demo-cart${i + 1}`,
      customerId: c.id,
      name: c.name,
      phone: c.phone,
      items: [{ productId: p.id, name: p.name, unitPrice: price, quantity: 1 }],
      subtotal: price,
      updatedAt: iso(new Date(now.getTime() - (3 + i * 20) * 3600_000)),
      recovered: false,
    };
  });

  const reviews: Review[] = [
    { id: "demo-r1", name: "Reseña de ejemplo", text: "Texto de ejemplo: acá se van a mostrar las opiniones reales de los clientes cuando se carguen o se conecte Google Reviews.", rating: 5, date: toDateKey(addDays(now, -12)), source: "manual", visible: true, demo: true },
    { id: "demo-r2", name: "Reseña de ejemplo", text: "Texto de ejemplo: la atención, la peluquería y el cuidado de las mascotas contados por quienes ya vinieron.", rating: 5, date: toDateKey(addDays(now, -30)), source: "manual", visible: true, demo: true },
    { id: "demo-r3", name: "Reseña de ejemplo", text: "Texto de ejemplo: la dueña puede aprobar, ocultar o editar cada reseña desde administración.", rating: 4, date: toDateKey(addDays(now, -45)), source: "manual", visible: true, demo: true },
  ];

  const createdAt = iso(daysAgo(10));
  const coupons: Coupon[] = [
    { id: "demo-cp1", code: "BIENVENIDA", title: "10% en tu primera compra", description: "Cupón de ejemplo", type: "porcentaje", value: 10, usedCount: 4, productIds: [], categoryIds: [], audience: "primera_compra", active: true, public: true, demo: true, createdAt },
    { id: "demo-cp2", title: "15% en juguetes", description: "Promoción automática de ejemplo", type: "porcentaje", value: 15, usedCount: 9, productIds: [], categoryIds: ["juguetes"], audience: "todos", active: true, public: true, demo: true, createdAt, endsAt: toDateKey(addDays(now, 20)) },
    { id: "demo-cp3", code: "VUELVE", title: "$2.000 off para clientes que vuelven", description: "Cupón de ejemplo", type: "fijo", value: 2000, minPurchase: 15000, usedCount: 2, productIds: [], categoryIds: [], audience: "recurrentes", active: true, public: false, demo: true, createdAt },
    { id: "demo-cp4", code: "ENVIOGRATIS", title: "Envío sin cargo", description: "Cupón de ejemplo", type: "envio_gratis", value: 0, minPurchase: 20000, maxUses: 50, usedCount: 11, productIds: [], categoryIds: [], audience: "todos", active: true, public: true, demo: true, createdAt },
  ];

  const byName = (re: RegExp) => sellable.find((p) => re.test(p.name));
  const comboPaseo = [byName(/pretal antitir/i), byName(/cintur[oó]n seguridad/i)].filter(Boolean) as Product[];
  const comboHigiene = [byName(/manopla/i), byName(/saca ?pelo/i)].filter(Boolean) as Product[];
  const unitPrice = (p: Product) => p.price ?? p.variants.find((v) => v.price != null)?.price ?? 0;
  const comboPrice = (ps: Product[]) => Math.round((ps.reduce((s, p) => s + unitPrice(p), 0) * 0.9) / 100) * 100;
  const combos: Combo[] = [
    { id: "demo-cb1", slug: "combo-bano-y-unas", name: "Combo baño + corte de uñas", description: "Combo de ejemplo con servicios. Definí el precio desde administración.", items: [{ serviceId: "bano", quantity: 1 }, { serviceId: "unas", quantity: 1 }], price: null, active: true, demo: true, createdAt },
    { id: "demo-cb2", slug: "combo-paseo", name: "Combo paseo", description: "Combo de ejemplo armado con productos del catálogo.", items: comboPaseo.map((p) => ({ productId: p.id, quantity: 1 })), price: comboPaseo.length ? comboPrice(comboPaseo) : null, active: comboPaseo.length > 1, demo: true, createdAt },
    { id: "demo-cb3", slug: "combo-higiene", name: "Combo higiene", description: "Combo de ejemplo armado con productos del catálogo.", items: comboHigiene.map((p) => ({ productId: p.id, quantity: 1 })), price: comboHigiene.length ? comboPrice(comboHigiene) : null, active: comboHigiene.length > 1, demo: true, createdAt },
  ];

  return { customers, pets, orders, appointments, waitlist, carts, reviews, coupons, combos };
}
