/** Email único con acceso al panel /dashboard (staff). */
export const ADMIN_EMAIL = "admin@bloom.com";

export function isAdminEmail(email: string | undefined | null): boolean {
  return (email ?? "").trim().toLowerCase() === ADMIN_EMAIL;
}
