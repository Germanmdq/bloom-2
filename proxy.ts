import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { supabaseSessionCookieOptions } from "@/lib/supabase/cookie-options";
import { isAdminEmail } from "@/lib/auth/admin";

export async function proxy(request: NextRequest) {
  const { pathname: path } = request.nextUrl;
  // Módulo Veterinaria: las páginas públicas no necesitan sesión (carga más rápida).
  // El panel /veterinaria/admin se protege con Supabase Auth + tabla vet_staff en modo "supabase".
  if (path.startsWith("/veterinaria") && !path.startsWith("/veterinaria/admin")) {
    return NextResponse.next({ request });
  }

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

  if (pathname.startsWith("/veterinaria/admin") && process.env.NEXT_PUBLIC_VET_DATA_SOURCE === "supabase") {
    if (!user) {
      return NextResponse.redirect(new URL(`/auth?next=${encodeURIComponent(pathname)}`, request.url));
    }
    const { data: staff } = await supabase.from("vet_staff").select("role").eq("user_id", user.id).maybeSingle();
    if (!staff) {
      return NextResponse.redirect(new URL("/veterinaria", request.url));
    }
    return response;
  }

  if (!user && pathname.startsWith("/cuenta")) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    // Además del administrador histórico por email, permitir cualquier
    // integrante del equipo que tenga un rol operativo en su perfil.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const isStaff = isAdminEmail(user.email) || ["ADMIN", "WAITER", "KITCHEN", "MANAGER"].includes(profile?.role ?? "");
    if (!isStaff) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
