/** ~400 días — alineado con el límite práctico de cookies y con @supabase/ssr defaults. */
export const SESSION_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

export const supabaseSessionCookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  maxAge: SESSION_COOKIE_MAX_AGE,
};
