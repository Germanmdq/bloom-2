import { NextResponse } from "next/server";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "El asistente de voz todavía no está configurado." }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const audio = form.get("audio");

    if (!(audio instanceof File) || !audio.size) {
      return NextResponse.json({ error: "No recibí el audio del pedido." }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "El audio es demasiado largo. Probá con un pedido más corto." }, { status: 413 });
    }

    const groqForm = new FormData();
    groqForm.set("file", audio, audio.name || "pedido.webm");
    groqForm.set("model", "whisper-large-v3-turbo");
    groqForm.set("language", "es");
    groqForm.set("prompt", "Pedido de cafetería Bloom. Productos como capuchino, latte, medialuna, tostado y café.");
    groqForm.set("response_format", "json");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: groqForm,
    });

    if (!response.ok) {
      console.error("[voice-transcription] Groq error", response.status, await response.text());
      return NextResponse.json({ error: "No pude transcribir el audio ahora." }, { status: 502 });
    }

    const payload = await response.json();
    const transcript = typeof payload?.text === "string" ? payload.text.trim() : "";
    if (!transcript) {
      return NextResponse.json({ error: "No pude entender el audio. Probá de nuevo." }, { status: 422 });
    }

    return NextResponse.json({ transcript: transcript.slice(0, 600) });
  } catch (error) {
    console.error("[voice-transcription]", error);
    return NextResponse.json({ error: "No pude procesar el audio." }, { status: 500 });
  }
}
