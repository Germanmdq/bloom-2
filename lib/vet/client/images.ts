"use client";
/**
 * Optimización de imágenes antes de guardarlas: redimensiona y convierte a
 * WebP en el navegador (fotos de mascotas y productos). En modo supabase se
 * suben a Storage (bucket `vet-media`); en modo demo quedan como data URL.
 */
import { INTEGRATIONS } from "../config/integrations";

export async function compressImage(file: File, maxSize = 900, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la imagen"))), "image/webp", quality));
}

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(b);
  });
}

/** Devuelve una URL lista para guardar en el producto/mascota. */
export async function uploadImage(file: File, folder: "products" | "pets" | "brand", maxSize = 900): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("El archivo no es una imagen");
  const blob = await compressImage(file, INTEGRATIONS.dataSource === "demo" ? Math.min(maxSize, 600) : maxSize);
  if (INTEGRATIONS.dataSource === "supabase") {
    const { createClient } = await import("@/lib/supabase/client");
    const sb = createClient();
    const path = `${folder}/${crypto.randomUUID()}.webp`;
    const { error } = await sb.storage.from("vet-media").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
    if (error) throw new Error(error.message);
    return sb.storage.from("vet-media").getPublicUrl(path).data.publicUrl;
  }
  return blobToDataUrl(blob);
}
