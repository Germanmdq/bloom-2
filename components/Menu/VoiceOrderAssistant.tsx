"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RobotHead } from "robot-heads";
import { Check, Mic, RotateCcw, X } from "lucide-react";

type Product = { id: string; name: string; description?: string | null; price: number };
type RobotState = "idle" | "thinking" | "listening" | "speaking" | "happy" | "error";
type VoiceItem = { id: string; quantity: number };
type VoiceTurn = { role: "user" | "assistant"; content: string };

export function VoiceOrderAssistant({
  products,
  onAddItems,
  onOpenCart,
}: {
  products: Product[];
  onAddItems: (items: VoiceItem[]) => void;
  onOpenCart: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<RobotState>("idle");
  const [listening, setListening] = useState(false);
  const [reply, setReply] = useState("¡Hola! Tocá el micrófono y pedime lo que quieras del menú.");
  const [pendingItems, setPendingItems] = useState<VoiceItem[]>([]);
  const [history, setHistory] = useState<VoiceTurn[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const discardAudioRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceIntervalRef = useRef<number | null>(null);
  const speechStartedRef = useRef(false);
  const silenceSinceRef = useRef<number | null>(null);

  const catalog = useMemo(
    () => products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description || "",
      price: Number(product.price) || 0,
    })),
    [products],
  );

  const pendingDescription = useMemo(
    () => pendingItems
      .map((item) => {
        const product = products.find((candidate) => candidate.id === item.id);
        return product ? `${item.quantity > 1 ? `${item.quantity} ` : ""}${product.name}` : null;
      })
      .filter(Boolean)
      .join(", "),
    [pendingItems, products],
  );

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

  const submit = useCallback(async (text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    setState("thinking");
    setPendingItems([]);
    try {
      const response = await fetch("/api/voice-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: cleaned, catalog, history: history.slice(-6) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error);
      const items = Array.isArray(data.items) ? data.items as VoiceItem[] : [];
      const message = typeof data.reply === "string"
        ? data.reply
        : "No llegué a identificar un producto. Decime cuál querés.";
      setHistory((previous) => {
        const next: VoiceTurn[] = [
          ...previous,
          { role: "user", content: cleaned },
          { role: "assistant", content: message },
        ];
        return next.slice(-8);
      });

      if (items.length) {
        const names = items
          .map((item) => {
            const product = products.find((candidate) => candidate.id === item.id);
            return product ? `${item.quantity > 1 ? `${item.quantity} ` : ""}${product.name}` : null;
          })
          .filter(Boolean)
          .join(", ");
        const confirmation = `Entendí: ${names}. ¿Querés confirmar este pedido?`;
        setPendingItems(items);
        setReply(confirmation);
        setState("happy");
        speak(confirmation);
        return;
      }

      setReply(message);
      setState("speaking");
      speak(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pude procesar el pedido.";
      setReply(message);
      setState("error");
    }
  }, [catalog, history, products, speak]);

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

  const confirmPendingOrder = () => {
    if (!pendingItems.length) return;
    onAddItems(pendingItems);
    setPendingItems([]);
    setReply("Listo, ya lo sumé al carrito.");
    closeAssistant();
    window.setTimeout(onOpenCart, 120);
  };

  const revisePendingOrder = () => {
    setPendingItems([]);
    setReply("Perfecto, decime de nuevo qué querés pedir o qué querés cambiar.");
    setState("idle");
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-36 right-4 z-[140] flex items-center gap-2 rounded-full bg-[#777b5b] py-2 pl-2 pr-4 text-sm font-bold text-[#f5e8ca] shadow-xl transition hover:scale-[1.02]"
        aria-label="Abrir asistente de pedidos por voz"
      >
        <RobotHead state="idle" shape="circle" size={42} color="#c4b896" trimColor="#f5e8ca" screenColor="#4b4e38" antenna={false} />
        Hablar ahora
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[210] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <section className="flex h-full w-full flex-col overflow-hidden bg-[#fffdf8] shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-[32px]">
      <div className="flex items-center gap-3 bg-[#777b5b] px-5 py-4 text-[#f5e8ca]">
        <RobotHead state={state} shape="circle" size={68} color="#c4b896" trimColor="#f5e8ca" screenColor="#4b4e38" antenna />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold">Bloom por voz</p>
          <p className="text-sm text-[#f5e8ca]">{listening ? "Escuchando tu pedido" : pendingItems.length ? "Revisá antes de agregar" : "Decime tu pedido"}</p>
        </div>
        <button type="button" onClick={closeAssistant} className="rounded-full p-2 hover:bg-white/10" aria-label="Cerrar asistente"><X size={22} /></button>
      </div>
      <div className="flex flex-1 flex-col justify-center space-y-5 p-5 sm:p-7">
        <p className="rounded-3xl bg-[#f2f0e6] p-5 text-base leading-relaxed text-[#4b4e38]">{reply}</p>
        {pendingItems.length ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-[#c4b896]/45 bg-white px-4 py-3 text-sm font-semibold text-[#4b4e38]">{pendingDescription}</div>
            <button type="button" onClick={confirmPendingOrder} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#777b5b] px-4 font-extrabold text-[#f5e8ca]"><Check size={21} />Confirmar pedido y ver carrito</button>
            <button type="button" onClick={revisePendingOrder} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#777b5b]/45 px-4 text-sm font-bold text-[#4b4e38]"><RotateCcw size={17} />Cambiar pedido</button>
          </div>
        ) : (
          <button type="button" onClick={() => { if (!listening) void startListening(); }} disabled={listening} className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl px-4 font-bold text-white disabled:cursor-default ${listening ? "bg-red-500 animate-pulse" : "bg-[#777b5b]"}`} aria-label="Hablar ahora">
            <Mic size={22} />
            {listening ? "Escuchando" : "Hablar ahora"}
          </button>
        )}
      </div>
      </section>
    </div>
  );
}
