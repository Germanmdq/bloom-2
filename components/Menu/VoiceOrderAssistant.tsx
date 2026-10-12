"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
  const [reply, setReply] = useState("¡Hola! Tocá el micrófono y pedime lo que quieras del menú.");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const catalog = useMemo(
    () => products.map((product) => ({ id: product.id, name: product.name, price: Number(product.price) || 0 })),
    [products],
  );

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

  const toggleListening = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
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
    setListening(true);
    setState("listening");
    recognition.start();
  }, [listening, submit]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-full bg-[#1a3028] py-2 pl-2 pr-4 text-sm font-bold text-white shadow-xl transition hover:scale-[1.02]"
        aria-label="Abrir asistente de pedidos por voz"
      >
        <RobotHead state="idle" shape="circle" size={42} color="#c4b896" trimColor="#f5e8ca" screenColor="#173c31" antenna={false} />
        Pedí por voz
      </button>
    );
  }

  return (
    <section className="fixed bottom-4 right-4 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-[#c4b896]/50 bg-[#fffdf8] shadow-2xl">
      <div className="flex items-center gap-3 bg-[#1a3028] px-4 py-3 text-white">
        <RobotHead state={state} shape="circle" size={58} color="#c4b896" trimColor="#f5e8ca" screenColor="#173c31" antenna />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">Bloom por voz</p>
          <p className="text-xs text-[#f5e8ca]">{listening ? "Te estoy escuchando…" : "Decime tu pedido"}</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Cerrar asistente"><X size={18} /></button>
      </div>
      <div className="space-y-3 p-4">
        <p className="rounded-2xl bg-[#f2f0e6] p-3 text-sm text-[#1a3028]">{reply}</p>
        <div className="flex gap-2">
          <button type="button" onClick={toggleListening} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white ${listening ? "bg-red-500 animate-pulse" : "bg-[#1a3028]"}`} aria-label={listening ? "Dejar de escuchar" : "Hablar con Bloom"}>
            <Mic size={20} />
          </button>
          <input value={transcript} onChange={(event) => setTranscript(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void submit(transcript); }} placeholder="Ej.: dos capuchinos y una medialuna" className="min-w-0 flex-1 rounded-2xl border border-[#c4b896]/50 bg-white px-3 text-sm outline-none focus:border-[#1a3028]" />
          <button type="button" onClick={() => void submit(transcript)} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#c4b896] text-[#1a3028]" aria-label="Enviar pedido"><Send size={18} /></button>
        </div>
      </div>
    </section>
  );
}
