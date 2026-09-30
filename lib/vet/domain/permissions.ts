/**
 * Roles y permisos. La MISMA matriz se aplica en:
 *  - la interfaz (ocultar acciones que el rol no puede hacer),
 *  - el servidor / proxy (bloquear rutas) y
 *  - la base de datos (políticas RLS en la migración SQL).
 * El frontend nunca es la única barrera: la seguridad real está en RLS.
 */
import type { StaffRole } from "../types";

export type Permission =
  | "dashboard.view"
  | "orders.manage"
  | "appointments.manage"
  | "customers.view"
  | "customers.manage"
  | "pets.manage"
  | "products.manage"
  | "prices.manage"
  | "stock.manage"
  | "promotions.manage"
  | "services.manage"
  | "content.manage"
  | "stats.view"
  | "settings.manage"
  | "automations.manage";

const ALL: Permission[] = [
  "dashboard.view", "orders.manage", "appointments.manage", "customers.view", "customers.manage", "pets.manage",
  "products.manage", "prices.manage", "stock.manage", "promotions.manage", "services.manage", "content.manage",
  "stats.view", "settings.manage", "automations.manage",
];

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  // Puede modificar todo.
  ADMIN: ALL,
  // Gestiona el día a día: pedidos, turnos, clientes y mascotas, y puede cargar stock.
  EMPLEADO: ["dashboard.view", "orders.manage", "appointments.manage", "customers.view", "pets.manage", "stock.manage"],
  // Solo su cuenta (no entra al panel).
  CLIENTE: [],
};

export const ROLE_LABEL: Record<StaffRole, string> = {
  ADMIN: "Administración",
  EMPLEADO: "Empleado/a",
  CLIENTE: "Cliente",
};

export function can(role: StaffRole | null | undefined, permission: Permission): boolean {
  return Boolean(role && ROLE_PERMISSIONS[role]?.includes(permission));
}

export function isStaff(role: StaffRole | null | undefined): boolean {
  return role === "ADMIN" || role === "EMPLEADO";
}
