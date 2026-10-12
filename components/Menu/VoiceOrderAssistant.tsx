"use client";

// Lucian UX/UI Prompt #084 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#084
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RobotHead } from "robot-heads";
import { Mic, Send, X } from "lucide-react";

type Product = { id: string; name: string; price: number };
type RobotState = "idle" | "thinking" | "listening" | "speaking" | "happy" | "error";

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function VoiceOrderAssistant({
  products,
  onAddItems,
}: {
  products: Product[];
  onAddItems: (items: Array<{ id: string; quantity: number }>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<RobotState>("idle");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("Mantené apretado el micrófono y decime qué querés pedir.");
  const [visibleReply, setVisibleReply] = useState(reply);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const heldRef = useRef(false);

  const catalog = useMemo(
    () => products.map((product) => ({ id: product.id, name: product.name, price: Number(product.price) || 0 })),
    [products],
  );

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || state === "thinking" || state === "listening") {
      setVisibleReply(reply);
      return;
    }

    setVisibleReply("");
    let character = 0;
    const timer = window.setInterval(() => {
      character += 1;
      setVisibleReply(reply.slice(0, character));
      if (character >= reply.length) window.clearInterval(timer);
    }, 18);
    return () => window.clearInterval(timer);
  }, [reply, state]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  const closeDialog = useCallback(() => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    heldRef.current = false;
    setListening(false);
    setOpen(false);
  }, []);

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

  const submit = useCallback(async (text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    setState("thinking");
    setReply("Estoy armando tu pedido…");
    try {
      const response = await fetch("/api/voice-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: cleaned, catalog }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error);
      const message = data.reply || "Listo, revisá el carrito.";
      if (Array.isArray(data.items) && data.items.length) onAddItems(data.items);
      setReply(message);
      setState(data.items?.length ? "happy" : "speaking");
      speak(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pude procesar el pedido.";
      setReply(message);
      setState("error");
    }
  }, [catalog, onAddItems, speak]);

  const startListening = useCallback(() => {
    if (heldRef.current || listening) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setReply("Tu navegador no permite dictado. Escribime el pedido abajo.");
      setState("error");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "es-AR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const text = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" ");
      setTranscript(text);
      void submit(text);
    };
    recognition.onerror = () => {
      setReply("No pude escuchar eso. Probá otra vez o escribí tu pedido.");
      setState("error");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    heldRef.current = true;
    setListening(true);
    setState("listening");
    setReply("Te estoy escuchando…");
    recognition.start();
  }, [listening, submit]);

  const stopListening = useCallback(() => {
    if (!heldRef.current) return;
    heldRef.current = false;
    setState("thinking");
    setReply("Procesando tu pedido…");
    recognitionRef.current?.stop();
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-[140] flex items-center gap-2 rounded-full bg-[#7a765a] py-2 pl-2 pr-4 text-sm font-bold text-white shadow-[0_10px_40px_-8px_rgba(122,118,90,0.55)] transition hover:bg-[#5f5c46] hover:scale-[1.02] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#c4b896]"
        aria-label="Abrir asistente de pedidos por voz"
        aria-haspopup="dialog"
      >
        <RobotHead state="idle" shape="circle" size={42} color="#c4b896" trimColor="#f2f0e6" screenColor="#2d4a3e" antenna={false} />
        Pedí por voz
      </button>

      {open && (
        <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={closeDialog}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-order-title"
            className="u084 relative w-full max-w-[390px] rounded-t-[30px] bg-[#fffdf8] px-6 pb-6 pt-5 shadow-2xl sm:rounded-[30px]"
            data-state={state === "listening" ? "listen" : state === "thinking" ? "think" : "idle"}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" onClick={closeDialog} className="absolute right-3 top-3 rounded-full p-2 text-[#7a765a] transition hover:bg-[#f2f0e6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7a765a]" aria-label="Cerrar asistente">
              <X size={19} />
            </button>

            <div className="flex items-center justify-center gap-3 pr-8 text-center">
              <RobotHead state={state} shape="circle" size={54} color="#c4b896" trimColor="#f2f0e6" screenColor="#2d4a3e" antenna />
              <div className="text-left">
                <p id="voice-order-title" className="font-extrabold text-[#3d3b2f]">Bloom por voz</p>
                <p className="text-xs font-semibold text-[#7a765a]" aria-live="polite">{listening ? "Escuchando" : state === "thinking" ? "Pensando" : "Asistente de pedidos"}</p>
              </div>
            </div>

            <div className="u084-dots" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((dot) => <i key={dot} style={{ "--i": dot } as React.CSSProperties} />)}
            </div>
            <p className={`u084-say ${state === "listening" || state === "thinking" ? "dim" : ""}`} aria-live="polite">
              {visibleReply}{state !== "thinking" && state !== "listening" && visibleReply.length < reply.length && <span className="u084-caret" />}
            </p>

            <div className="flex flex-col items-center">
              <button
                type="button"
                className="u084-mic"
                onPointerDown={(event) => { if (event.button === 0) { event.currentTarget.setPointerCapture(event.pointerId); startListening(); } }}
                onPointerUp={stopListening}
                onPointerCancel={stopListening}
                onKeyDown={(event) => { if ((event.key === " " || event.key === "Enter") && !event.repeat) { event.preventDefault(); startListening(); } }}
                onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); stopListening(); } }}
                aria-label="Mantené apretado para hablar"
              >
                <Mic size={28} aria-hidden="true" />
              </button>
              <span className="mt-3 text-xs font-semibold text-[#7a765a]">Mantené apretado para hablar</span>
            </div>

            <div className="mt-5 flex gap-2 border-t border-[#c4b896]/35 pt-4">
              <input value={transcript} onChange={(event) => setTranscript(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void submit(transcript); }} placeholder="O escribí tu pedido" className="min-w-0 flex-1 rounded-2xl border border-[#c4b896]/60 bg-white px-3 py-3 text-sm text-[#3d3b2f] outline-none focus:border-[#7a765a] focus:ring-2 focus:ring-[#c4b896]/40" />
              <button type="button" onClick={() => void submit(transcript)} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7a765a] text-white transition hover:bg-[#5f5c46] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#c4b896]" aria-label="Enviar pedido"><Send size={18} /></button>
            </div>
          </section>
        </div>
      )}

      <style jsx>{`
        .u084 { overflow: hidden; }
        .u084-dots { display: flex; height: 92px; align-items: center; justify-content: center; gap: 12px; }
        .u084-dots i { width: 22px; height: 22px; border-radius: 999px; background: linear-gradient(180deg, #c4b896, #7a765a); transition: height .12s linear; }
        .u084-dots i:nth-child(2), .u084-dots i:nth-child(4) { background: linear-gradient(180deg, #a8c9b8, #3d6b52); }
        .u084-dots i:nth-child(3) { background: linear-gradient(180deg, #f2e8ca, #a89868); }
        [data-state="idle"] .u084-dots i { animation: u084-breath 2.4s ease-in-out infinite; animation-delay: calc(var(--i) * .12s); }
        [data-state="think"] .u084-dots i { animation: u084-wave 1s cubic-bezier(.45,0,.55,1) infinite; animation-delay: calc(var(--i) * .1s); }
        [data-state="listen"] .u084-dots i { animation: u084-listen .72s ease-in-out infinite alternate; animation-delay: calc(var(--i) * .1s); }
        .u084-say { min-height: 50px; margin: 0 auto 18px; max-width: 300px; text-align: center; font-size: 16px; line-height: 1.45; font-weight: 750; letter-spacing: -.02em; color: #3d3b2f; }
        .u084-say.dim { color: #7a765a; font-size: 14px; font-weight: 650; }
        .u084-caret { display: inline-block; width: 2px; height: 1em; margin-left: 2px; vertical-align: -2px; background: #7a765a; animation: u084-caret 1s steps(1) infinite; }
        .u084-mic { position: relative; display: grid; width: 76px; height: 76px; place-items: center; border: 0; border-radius: 999px; background: #7a765a; color: white; box-shadow: 0 10px 25px -8px rgba(122,118,90,.6); touch-action: none; transition: transform .35s cubic-bezier(.34,1.45,.64,1), background-color .3s; }
        [data-state="listen"] .u084-mic { background: #3d6b52; transform: scale(1.08); }
        .u084-mic:focus-visible { outline: 2px solid #7a765a; outline-offset: 6px; }
        @keyframes u084-breath { 50% { transform: scale(1.15); opacity: .75; } }
        @keyframes u084-wave { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-18px); } }
        @keyframes u084-listen { from { height: 24px; transform: translateY(6px); } to { height: 70px; transform: translateY(-6px); } }
        @keyframes u084-caret { 50% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .u084 *, .u084 *::before, .u084 *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; } }
      `}</style>
    </>
  );
}
