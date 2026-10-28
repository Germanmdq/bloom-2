"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RobotHead } from "robot-heads";
import { Check, Mic, RotateCcw, X } from "lucide-react";

type RobotState = "idle" | "thinking" | "listening" | "speaking" | "happy" | "error";
type VoiceTurn = { role: "user" | "assistant"; content: string };
type DraftState = Record<string, unknown>;
type PricedLine = { id: string; name: string; quantity: number; unitPrice: number; subtotal: number; notes?: string };

const money = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export function VoiceOrderAssistant({ isOverlayOpen }: { isOverlayOpen: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<RobotState>("idle");
  const [listening, setListening] = useState(false);
  const [reply, setReply] = useState("¡Hola! Tocá el micrófono y pedime lo que quieras de la carta.");
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [lines, setLines] = useState<PricedLine[]>([]);
  const [total, setTotal] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [history, setHistory] = useState<VoiceTurn[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const discardAudioRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceIntervalRef = useRef<number | null>(null);
  const speechStartedRef = useRef(false);
  const silenceSinceRef = useRef<number | null>(null);

  const stopMicrophone = useCallback(() => {
    if (silenceIntervalRef.current !== null) {
      window.clearInterval(silenceIntervalRef.current);
      silenceIntervalRef.current = null;
    }
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => {
    discardAudioRef.current = true;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    stopMicrophone();
    window.speechSynthesis?.cancel();
  }, [stopMicrophone]);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-AR";
    utterance.rate = 1.05;
    utterance.onstart = () => setState("speaking");
    utterance.onend = () => setState("happy");
    window.speechSynthesis.speak(utterance);
  }, []);

  const send = useCallback(async (payload: { transcript?: string; confirm?: boolean }) => {
    setState("thinking");
    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, history: history.slice(-12), draft, token }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "No pude procesar el pedido.");
      const message = typeof data.reply === "string" ? data.reply : "No llegué a entender. ¿Me lo repetís?";
      setHistory((previous) => [
        ...previous,
        ...(payload.transcript ? [{ role: "user" as const, content: payload.transcript }] : []),
        { role: "assistant" as const, content: message },
      ].slice(-12));
      setDraft(data.draft ?? null);
      setLines(Array.isArray(data.lines) ? data.lines : []);
      setTotal(Number(data.total) || 0);
      setToken(typeof data.token === "string" ? data.token : null);
      setOrderNumber(data.orderId ? String(data.orderNumber ?? "") || "ok" : null);
      setReply(message);
      setState(data.orderId ? "happy" : "speaking");
      speak(message);
    } catch (error) {
      setReply(error instanceof Error ? error.message : "No pude procesar el pedido.");
      setState("error");
    }
  }, [draft, history, speak, token]);

  const submit = useCallback(async (text: string) => {
    const cleaned = text.trim();
    if (cleaned) await send({ transcript: cleaned });
  }, [send]);

  const transcribeAudio = useCallback(async (audio: Blob) => {
    setState("thinking");
    setReply("Estoy escuchando tu pedido…");
    try {
      const form = new FormData();
      form.set("audio", audio, "pedido.webm");
      const response = await fetch("/api/voice-transcription", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error);
      const text = typeof data?.transcript === "string" ? data.transcript : "";
      if (!text) throw new Error("No pude entender el audio. Probá de nuevo.");
      await submit(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pude procesar el audio.";
      setReply(message);
      setState("error");
    }
  }, [submit]);

  const startListening = useCallback(async () => {
    if (listening) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setReply("Este navegador no permite usar el micrófono para pedidos por voz.");
      setState("error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : undefined);
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      streamRef.current = stream;
      audioContextRef.current = audioContext;
      audioChunksRef.current = [];
      discardAudioRef.current = false;
      speechStartedRef.current = false;
      silenceSinceRef.current = null;
      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        setListening(false);
        stopMicrophone();
        if (discardAudioRef.current) return;
        const audio = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (audio.size) void transcribeAudio(audio);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      silenceIntervalRef.current = window.setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        let energy = 0;
        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          energy += normalized * normalized;
        }
        const volume = Math.sqrt(energy / samples.length);
        const now = Date.now();

        if (volume > 0.018) {
          speechStartedRef.current = true;
          silenceSinceRef.current = null;
          return;
        }
        if (!speechStartedRef.current) return;
        silenceSinceRef.current ??= now;
        if (now - silenceSinceRef.current >= 2000 && recorder.state === "recording") {
          recorder.stop();
        }
      }, 200);
      setListening(true);
      setState("listening");
      setReply("Te estoy escuchando…");
    } catch {
      setReply("Necesito permiso para usar el micrófono. Permitilo en el navegador y probá otra vez.");
      setState("error");
    }
  }, [listening, stopMicrophone, transcribeAudio]);

  const closeAssistant = useCallback(() => {
    discardAudioRef.current = true;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    stopMicrophone();
    window.speechSynthesis?.cancel();
    setListening(false);
    setOpen(false);
  }, [stopMicrophone]);

  const confirmOrder = () => void send({ confirm: true });

  const reviseOrder = () => {
    setToken(null);
    setReply("Dale, decime qué querés cambiar o agregar.");
    setState("idle");
    void startListening();
  };

  const hasOrder = lines.length > 0 && !orderNumber;

  if (!open) {
    // El acceso queda fijo mientras se navega, pero no puede tapar ninguna vista de acción.
    if (isOverlayOpen) return null;

    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-3 z-[120] flex items-center gap-2 rounded-full bg-[#777b5b] py-2 pl-2 pr-3 text-sm font-bold text-[#f5e8ca] shadow-xl transition hover:scale-[1.02] sm:bottom-8 sm:right-6 sm:z-[120]"
        aria-label="Abrir asistente de pedidos por voz"
      >
        <RobotHead state="idle" shape="circle" size={42} color="#c4b896" trimColor="#f5e8ca" screenColor="#4b4e38" antenna={false} />
        Hablar ahora
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[210] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <section className="flex h-[100dvh] w-full min-h-0 flex-col overflow-hidden bg-[#fffdf8] shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-[32px]">
      <div className="flex shrink-0 items-center gap-3 bg-[#777b5b] px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-[#f5e8ca]">
        <RobotHead state={state} shape="circle" size={68} color="#c4b896" trimColor="#f5e8ca" screenColor="#4b4e38" antenna />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold">Bloom por voz</p>
          <p className="text-sm text-[#f5e8ca]">{listening ? "Escuchando tu pedido" : hasOrder ? "Revisá tu pedido" : "Decime tu pedido"}</p>
        </div>
        <button type="button" onClick={closeAssistant} className="rounded-full p-2 hover:bg-white/10" aria-label="Cerrar asistente"><X size={22} /></button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-7">
        <p className="rounded-3xl bg-[#f2f0e6] p-5 text-base leading-relaxed text-[#4b4e38]">{reply}</p>
        {hasOrder && (
          <div className="rounded-2xl border border-[#c4b896]/45 bg-white px-4 py-3 text-sm font-semibold text-[#4b4e38]">
            <ul className="space-y-1">
              {lines.map((l) => (
                <li key={`${l.id}-${l.notes ?? ""}`} className="flex justify-between gap-3">
                  <span>{l.quantity} × {l.name}{l.notes ? ` (${l.notes})` : ""}</span>
                  <span>{money(l.subtotal)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex justify-between border-t border-[#c4b896]/40 pt-2 text-base font-extrabold"><span>Total</span><span>{money(total)}</span></p>
          </div>
        )}
        {orderNumber && (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-800">Pedido registrado{orderNumber !== "ok" ? ` #${orderNumber}` : ""}. Ya está en cocina.</p>
        )}
        {token ? (
          <div className="space-y-3">
            <button type="button" onClick={confirmOrder} disabled={state === "thinking"} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#777b5b] px-4 font-extrabold text-[#f5e8ca] disabled:opacity-60"><Check size={20} /> Confirmar y enviar el pedido</button>
            <button type="button" onClick={reviseOrder} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#777b5b]/45 px-4 text-sm font-bold text-[#4b4e38]"><RotateCcw size={18} /> Quiero cambiar algo</button>
          </div>
        ) : (
          <button type="button" onClick={() => { if (!listening) void startListening(); }} disabled={listening || state === "thinking"} className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl px-4 font-bold ${listening ? "bg-red-600 text-white" : "bg-[#777b5b] text-[#f5e8ca]"} disabled:opacity-80`}>
            <Mic size={22} />
            {listening ? "Escuchando" : state === "thinking" ? "Pensando…" : "Hablar ahora"}
          </button>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); const t = typed; setTyped(""); void submit(t); }}
          className="flex gap-2"
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="O escribí tu pedido…"
            className="min-h-11 min-w-0 flex-1 rounded-2xl border border-[#c4b896]/60 bg-white px-4 text-base outline-none focus:border-[#777b5b]"
          />
          <button type="submit" disabled={!typed.trim() || state === "thinking"} className="rounded-2xl bg-[#4b4e38] px-4 text-sm font-bold text-[#f5e8ca] disabled:opacity-50">Enviar</button>
        </form>
      </div>
      </section>
    </div>
  );
}
