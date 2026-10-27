import { redirect } from "next/navigation";

/** El registro ahora es parte de /acceso (teléfono → nombre y dirección si es nuevo). */
export default async function RegistroPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect: target } = await searchParams;
  const safe = target && target.startsWith("/") && !target.startsWith("//") ? `?redirect=${encodeURIComponent(target)}` : "";
  redirect(`/acceso${safe}`);
}
