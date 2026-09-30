/** Inserta datos estructurados JSON-LD (se renderiza en el servidor). */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // El contenido proviene de la configuración/catálogo; se escapa "<" para evitar cierre de etiqueta.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
