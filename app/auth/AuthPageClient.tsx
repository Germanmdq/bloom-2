"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/auth/admin";
import { IconEye, IconEyeOff, IconLoader2, IconMail } from "@tabler/icons-react";
import { SiteFooter } from "@/components/SiteFooter";
import { FoodKingMobileNavPanel } from "@/components/FoodKingMobileNav";
import { SiteHeader } from "@/components/SiteHeader";

type Panel = "login" | "register";

function translateAuthError(err: AuthError): string {
  const msg = err.message.toLowerCase();
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (msg.includes("email not confirmed")) {
    return "Confirmá tu correo antes de iniciar sesión.";
  }
  if (msg.includes("user already registered") || msg.includes("already registered")) {
    return "Ese email ya está registrado. Iniciá sesión.";
  }
  if (msg.includes("password")) {
    return "La contraseña no cumple los requisitos.";
  }
  if (msg.includes("email")) {
    return "Revisá el formato del email.";
  }
  return err.message || "Algo salió mal. Intentá de nuevo.";
}

/** Ruta interna segura para `redirect` (evita open redirect). */
function safeInternalPath(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t || !t.startsWith("/") || t.startsWith("//")) return null;
  if (t.includes("..")) return null;
  return t;
}

function combineRegisterAddress(line: string, extra: string): string {
  const a = line.trim();
  const b = extra.trim();
  if (!a) return b;
  if (!b) return a;
  return `${a} - ${b}`;
}

export function AuthPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [panel, setPanel] = useState<Panel>("login");

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "register") {
      setPanel("register");
    }
  }, [searchParams]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regAddressLine, setRegAddressLine] = useState("");
  const [regAddressExtra, setRegAddressExtra] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const emailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim().toLowerCase());

  const login = async () => {
    setError("");
    setInfo("");
    const raw = loginEmail.trim().toLowerCase();
    // If it looks like a phone (no @), derive the bloom.local email
    const isPhone = !raw.includes("@");
    const email = isPhone ? `${raw.replace(/\D/g, "")}@bloom.local` : raw;
    if (!email) {
      setError("Ingresá tu email o celular.");
      return;
    }
    if (!loginPassword) {
      setError("Ingresá tu contraseña.");
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password: loginPassword });
    setLoading(false);
    if (err) {
      console.error(err);
      setError(translateAuthError(err));
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    const isStaff = profile?.role === 'ADMIN' || profile?.role === 'WAITER' || profile?.role === 'KITCHEN' || isAdminEmail(data?.user?.email);

    if (isStaff) {
      router.replace("/dashboard");
    } else {
      const redirect = safeInternalPath(searchParams.get("redirect")) ?? "/cuenta";
      router.replace(redirect);
    }
    router.refresh();
  };

  const register = async () => {
    setError("");
    setInfo("");
    const name = regName.trim();
    const email = regEmail.trim().toLowerCase();
    const phone = regPhone.trim();
    const addressLine = regAddressLine.trim();
    const addressExtra = regAddressExtra.trim();
    if (!name) {
      setError("Ingresá tu nombre.");
      return;
    }
    if (!phone) {
      setError("Ingresá tu teléfono.");
      return;
    }
    if (!addressLine) {
      setError("Ingresá la dirección de entrega (calle y número).");
      return;
    }
    if (!addressExtra) {
      setError("Ingresá piso, dpto o referencia de entrega.");
      return;
    }
    if (!emailValid(email)) {
      setError("Ingresá un email válido.");
      return;
    }
    if (regPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const redirectAfterAuth = safeInternalPath(searchParams.get("redirect")) ?? "/cuenta";
    const defaultAddress = combineRegisterAddress(addressLine, addressExtra);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password: regPassword,
      options: {
        data: {
          full_name: name,
          is_customer: true,
          phone,
          default_address: defaultAddress,
        },
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}${redirectAfterAuth}` : undefined,
      },
    });
    setLoading(false);
    if (err) {
      console.error(err);
      setError(translateAuthError(err));
      return;
    }
    if (data.session) {
      router.replace(redirectAfterAuth);
      router.refresh();
      return;
    }
    setInfo("Te enviamos un correo para confirmar tu cuenta. Después podés iniciar sesión.");
  };

  const switchToLogin = () => {
    setPanel("login");
    setError("");
    setInfo("");
    setShowPassword(false);
  };

  const switchToRegister = () => {
    setPanel("register");
    setError("");
    setInfo("");
    setShowPassword(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans text-neutral-900">
      <FoodKingMobileNavPanel open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <SiteHeader scrolled={false} onMobileNavOpen={() => setMobileNavOpen(true)} activeNav={null} />

      <main className="mx-auto max-w-md px-5 pb-16 pt-10">
        <div className="mb-8 text-center" aria-hidden="true">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#e8e4d4] ring-2 ring-[#c4b896]/40">
            <IconMail className="h-9 w-9 text-[#5f5c46]" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-900">
            {panel === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            {panel === "login" ? "Ingresá con tu email o celular." : "Completá tus datos para registrarte."}
          </p>
        </div>

        <div className="rounded-3xl border border-amber-100/80 bg-white p-6 shadow-sm">
          {panel === "login" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neutral-400 mb-1.5">Email o celular</label>
                <input
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="vos@email.com o 223 000-0000"
                    value={loginEmail}
                    onChange={(e) => {
                    setLoginEmail(e.target.value);
                    setError("");
                    setInfo("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && void login()}
                    className={`w-full rounded-2xl border-2 px-4 py-4 text-base font-bold outline-none transition-all placeholder:font-medium placeholder:text-neutral-300 ${
                    error ? "border-red-300 bg-red-50" : "border-neutral-200 focus:border-[#7a765a]"
                    }`}
                    autoFocus
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-black uppercase tracking-wider text-neutral-400 mb-1.5">Contraseña</label>
                <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setError("");
                    setInfo("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && void login()}
                    className={`w-full rounded-2xl border-2 pl-4 pr-12 py-4 text-base font-bold outline-none transition-all placeholder:font-medium placeholder:text-neutral-300 ${
                    error ? "border-red-300 bg-red-50" : "border-neutral-200 focus:border-[#7a765a]"
                    }`}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute bottom-4 right-4 text-neutral-400 hover:text-[#7a765a] transition-colors"
                >
                    {showPassword ? <IconEyeOff className="h-5 w-5" /> : <IconEye className="h-5 w-5" />}
                </button>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#2d4a3e] cursor-pointer"
                />
                <span className="text-sm font-medium text-neutral-500">Recordarme</span>
              </label>
              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
              {info ? <p className="text-sm font-medium text-[#2d4a3e]">{info}</p> : null}
              <button
                type="button"
                onClick={() => void login()}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2d4a3e] py-4 text-base font-black text-white shadow-lg shadow-[#2d4a3e]/20 transition hover:bg-[#1f352c] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? <IconLoader2 className="h-5 w-5 animate-spin" /> : null}
                Iniciar sesión
              </button>
              <p className="text-center text-sm text-neutral-600">
                ¿No tenés cuenta?{" "}
                <Link href="/registro" className="font-bold text-[#2d4a3e] underline-offset-2 hover:underline">
                  Registrate gratis →
                </Link>
              </p>
            </div>
          )}

          {panel === "register" && (
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase tracking-wider text-neutral-400">Nombre</label>
              <input
                type="text"
                autoComplete="name"
                placeholder="Tu nombre"
                value={regName}
                onChange={(e) => {
                  setRegName(e.target.value);
                  setError("");
                  setInfo("");
                }}
                className={`w-full rounded-2xl border-2 px-4 py-4 text-base font-bold outline-none transition-all placeholder:font-medium placeholder:text-neutral-300 ${
                  error ? "border-red-300 bg-red-50" : "border-neutral-200 focus:border-[#7a765a]"
                }`}
                required
                autoFocus
              />
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neutral-400">Teléfono</label>
                <input
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="11 2345-6789"
                  value={regPhone}
                  onChange={(e) => {
                    setRegPhone(e.target.value);
                    setError("");
                    setInfo("");
                  }}
                  className={`mt-1 w-full rounded-2xl border-2 px-4 py-4 text-base font-bold outline-none transition-all placeholder:font-medium placeholder:text-neutral-300 ${
                    error ? "border-red-300 bg-red-50" : "border-neutral-200 focus:border-[#7a765a]"
                  }`}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neutral-400">
                  Dirección habitual de entrega
                </label>
                <input
                  type="text"
                  autoComplete="street-address"
                  placeholder="Av. Independencia 1900"
                  value={regAddressLine}
                  onChange={(e) => {
                    setRegAddressLine(e.target.value);
                    setError("");
                    setInfo("");
                  }}
                  className={`mt-1 w-full rounded-2xl border-2 px-4 py-4 text-base font-bold outline-none transition-all placeholder:font-medium placeholder:text-neutral-300 ${
                    error ? "border-red-300 bg-red-50" : "border-neutral-200 focus:border-[#7a765a]"
                  }`}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neutral-400">
                  Piso / Dpto / Referencia
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Piso 3 Of. 12, frente a Tribunales"
                  value={regAddressExtra}
                  onChange={(e) => {
                    setRegAddressExtra(e.target.value);
                    setError("");
                    setInfo("");
                  }}
                  className={`mt-1 w-full rounded-2xl border-2 px-4 py-4 text-base font-bold outline-none transition-all placeholder:font-medium placeholder:text-neutral-300 ${
                    error ? "border-red-300 bg-red-50" : "border-neutral-200 focus:border-[#7a765a]"
                  }`}
                  required
                />
              </div>
              <label className="block text-xs font-black uppercase tracking-wider text-neutral-400">Email</label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="vos@email.com"
                value={regEmail}
                onChange={(e) => {
                  setRegEmail(e.target.value);
                  setError("");
                  setInfo("");
                }}
                className={`w-full rounded-2xl border-2 px-4 py-4 text-base font-bold outline-none transition-all placeholder:font-medium placeholder:text-neutral-300 ${
                  error ? "border-red-300 bg-red-50" : "border-neutral-200 focus:border-[#7a765a]"
                }`}
                required
              />
              <label className="block text-xs font-black uppercase tracking-wider text-neutral-400">Contraseña (mín. 6 caracteres)</label>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                value={regPassword}
                onChange={(e) => {
                  setRegPassword(e.target.value);
                  setError("");
                  setInfo("");
                }}
                onKeyDown={(e) => e.key === "Enter" && void register()}
                className={`w-full rounded-2xl border-2 px-4 py-4 text-base font-bold outline-none transition-all placeholder:font-medium placeholder:text-neutral-300 ${
                  error ? "border-red-300 bg-red-50" : "border-neutral-200 focus:border-[#7a765a]"
                }`}
                required
                minLength={6}
              />
              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
              {info ? <p className="text-sm font-medium text-[#2d4a3e]">{info}</p> : null}
              <button
                type="button"
                onClick={() => void register()}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2d4a3e] py-4 text-base font-black text-white shadow-lg shadow-[#2d4a3e]/20 transition hover:bg-[#1f352c] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? <IconLoader2 className="h-5 w-5 animate-spin" /> : null}
                Crear cuenta
              </button>
              <p className="text-center text-sm text-neutral-600">
                ¿Ya tenés cuenta?{" "}
                <button type="button" onClick={switchToLogin} className="font-bold text-[#2d4a3e] underline-offset-2 hover:underline">
                  Iniciá sesión
                </button>
              </p>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-neutral-400">Tu cuenta es solo para Bloom: pedidos y beneficios.</p>
      </main>
      <SiteFooter />
    </div>
  );
}
