import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "El servidor todavía no tiene configurada la carga segura." }, { status: 503 });
    const form = await request.formData();
    const token = form.get("token");
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 12 * 1024 * 1024) return NextResponse.json({ error: "Elegí una imagen o PDF de hasta 12 MB." }, { status: 400 });
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") return NextResponse.json({ error: "Formato no admitido." }, { status: 400 });
    const supabase = createServiceRoleClient();
    if (typeof token !== "string" || !token) return NextResponse.json({ error: "Escaneá un QR nuevo desde el panel." }, { status: 401 });
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { data: uploadSession, error: sessionError } = await supabase.from("invoice_upload_tokens").select("id, expires_at").eq("token_hash", tokenHash).maybeSingle();
    if (sessionError || !uploadSession || new Date(uploadSession.expires_at).getTime() < Date.now()) return NextResponse.json({ error: "Este QR venció. Generá uno nuevo desde el panel." }, { status: 401 });
    const name = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("invoice-captures").upload(name, file, { contentType: file.type });
    if (uploadError) throw uploadError;
    const { error: rowError } = await supabase.from("invoice_captures").insert({ file_path: name, file_name: file.name, mime_type: file.type, status: "pending", upload_token_id: uploadSession.id });
    if (rowError) throw rowError;
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Error al recibir la factura." }, { status: 500 }); }
}
