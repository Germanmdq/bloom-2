import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { supabaseSessionCookieOptions } from "@/lib/supabase/cookie-options";
import { isAdminEmail } from "@/lib/auth/admin";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookieOptions: supabaseSessionCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/cuenta")) {
    return NextResponse.redirect(new URL("/acceso?redirect=/cuenta", request.url));
  }

  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      return NextResponse.redirect(new URL("/acceso?redirect=/dashboard", request.url));
    }

    // Además del administrador histórico por email, permitir cualquier
    // integrante del equipo que tenga un rol operativo en su perfil.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_customer")
      .eq("id", user.id)
      .maybeSingle();
    // Un cliente (is_customer) nunca es personal, aunque su rol por defecto sea WAITER.
    const isStaff = isAdminEmail(user.email) || (profile?.is_customer !== true && ["ADMIN", "WAITER", "KITCHEN", "MANAGER"].includes(profile?.role ?? ""));
    if (!isStaff) {
      return NextResponse.redirect(new URL("/acceso?redirect=/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
