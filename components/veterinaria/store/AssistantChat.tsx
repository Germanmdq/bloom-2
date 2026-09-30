"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, ShieldAlert } from "lucide-react";
import { vetPath } from "@/lib/vet/config/integrations";
import { ruleBasedReply, type AssistantAction, type AssistantReply } from "@/lib/vet/domain/assistant";
import { waLink, WA_MESSAGES } from "@/lib/vet/domain/whatsapp";
import { useSettings } from "@/lib/vet/client/store";
import { track } from "@/lib/vet/client/analytics";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  text: string;
  actions?: AssistantAction[];
  warning?: boolean;
}

const SUGGESTIONS = ["Quiero sacar turno para baño", "¿Dónde están?", "Busco un pretal", "¿Hacen envíos?", "Mi perro está vomitando"];

export function AssistantChat() {
  const settings = useSettings();
  const b = settings.business;
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", text: settings.assistant.greeting }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [msgs.length]);

  const send = async (message: string) => {
    const m = message.trim();
    if (!m || busy) return;
    setText("");
    setMsgs((x) => [...x, { role: "user", text: m }]);
    setBusy(true);
    track("assistant_message", { length: m.length });
    let reply: AssistantReply;
    try {
      // El servidor puede usar IA (si se configura); si falla, respondemos con reglas locales.
      const res = await fetch("/api/veterinaria/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: m }) });
      if (!res.ok) throw new Error();
      reply = await res.json();
    } catch {
      reply = ruleBasedReply(m, {
        businessName: b.name,
        whatsappHref: waLink(b.whatsapp, WA_MESSAGES.help()),
        base: vetPath(),
        hoursText: "Mirá los horarios en la sección Ubicación.",
        hasAddress: Boolean(b.address.street),
      });
    }
    setMsgs((x) => [...x, { role: "assistant", text: reply.text, actions: reply.actions, warning: reply.intent === "medico" || reply.intent === "urgencia" }]);
    setBusy(false);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 pt-5 sm:px-6" style={{ minHeight: "calc(100dvh - 180px)" }}>
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-vet-primary text-white"><Bot className="size-6" /></span>
        <div>
          <h1 className="font-vet-display text-xl font-extrabold">Asistente de {b.name}</h1>
          <p className="text-xs text-neutral-500">Te oriento con productos, turnos y contacto. No doy diagnósticos veterinarios.</p>
        </div>
      </div>

      <div className="mt-5 flex-1 space-y-3" role="log" aria-live="polite" aria-label="Conversación">
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed vet-rise", m.role === "user" ? "rounded-br-lg bg-vet-primary text-white" : m.warning ? "rounded-bl-lg bg-amber-50 text-amber-950 ring-1 ring-amber-200" : "rounded-bl-lg bg-white ring-1 ring-black/[0.06]")}>
              {m.warning && <ShieldAlert className="mb-1 size-5 text-amber-700" aria-hidden="true" />}
              <p>{m.text}</p>
              {m.actions && m.actions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.actions.map((a) =>
                    a.kind === "whatsapp" || a.href.startsWith("http") ? (
                      <a key={a.label} href={a.href} target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp_click", { context: "assistant" })} className="inline-flex h-9 items-center rounded-xl bg-[#128C4B] px-3 text-sm font-bold text-white">{a.label}</a>
                    ) : (
                      <Link key={a.label} href={a.href} className="inline-flex h-9 items-center rounded-xl bg-vet-tint px-3 text-sm font-bold text-vet-primary-dark">{a.label}</Link>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="flex"><div className="rounded-3xl bg-white px-4 py-3 text-sm text-neutral-500 ring-1 ring-black/[0.06]">Escribiendo…</div></div>}
        <div ref={endRef} />
      </div>

      {msgs.length <= 1 && (
        <div className="vet-scroll-x -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => send(s)} className="h-10 shrink-0 rounded-full bg-white px-4 text-sm font-medium ring-1 ring-black/[0.08]">{s}</button>
          ))}
        </div>
      )}

      <form
        className="sticky bottom-[80px] mt-4 flex gap-2 rounded-3xl bg-white p-2 shadow-lg ring-1 ring-black/[0.06] lg:bottom-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <label htmlFor="assistant-input" className="sr-only">Escribí tu consulta</label>
        <input id="assistant-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribí tu consulta…" className="h-12 flex-1 rounded-2xl px-3 text-[16px] outline-none" autoComplete="off" maxLength={500} />
        <button type="submit" disabled={!text.trim() || busy} className="grid size-12 place-items-center rounded-2xl bg-vet-primary text-white disabled:opacity-40" aria-label="Enviar">
          <Send className="size-5" />
        </button>
      </form>
    </div>
  );
}
