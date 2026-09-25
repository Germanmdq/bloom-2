"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "Arial, sans-serif", textAlign: "center" }}>
          <div>
            <h1>Algo salió mal</h1>
            <p>Por favor, intentá nuevamente.</p>
            <button type="button" onClick={reset}>Reintentar</button>
          </div>
        </main>
      </body>
    </html>
  );
}
