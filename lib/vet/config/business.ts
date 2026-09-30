/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  CONFIGURACIÓN CENTRAL DEL NEGOCIO — Vida de Perros               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Este es el ÚNICO lugar del código con los datos del negocio.
 * Todo lo que está acá también se puede editar sin tocar código desde
 * /veterinaria/admin/configuracion (lo guardado ahí tiene prioridad).
 *
 * Datos CONFIRMADOS (provistos por la dueña):
 *   - Nombre, rubros, frase, WhatsApp, Instagram, paleta de colores.
 *
 * Datos PENDIENTES (valor `null` = todavía no informado; la app lo oculta
 * o muestra "a confirmar" en vez de inventarlo):
 *   - Dirección, coordenadas, email, horarios definitivos, datos bancarios.
 */
import type { BusinessSettings } from "../types";

export const BUSINESS: BusinessSettings = {
  name: "Vida de Perros",
  legalName: undefined,
  tagline: "Amor, cuidado y bienestar para ellos",
  description:
    "Veterinaria, peluquería canina y pet shop. Productos, turnos y atención para perros, gatos y todas las mascotas de la familia.",

  /**
   * Logo. Reemplazá el archivo por el logo original manteniendo el nombre
   * (o cambiá la ruta). Formatos recomendados: SVG o PNG/WebP con fondo transparente.
   * Luego corré `npm run vet:pwa-assets` para regenerar los íconos de la app.
   */
  logo: "/veterinaria/brand/logo.svg",
  logoAlt: "Vida de Perros — Veterinaria, peluquería canina y pet shop",

  phone: "+54 11 5977-2229",
  /** Solo dígitos, formato internacional (Argentina móvil: 54 9 + área + número). */
  whatsapp: "5491159772229",
  email: null,
  instagram: "vdperros",
  facebook: null,
  tiktok: null,
  website: null,

  address: {
    street: null,
    city: null,
    province: null,
    postalCode: null,
    country: "AR",
  },
  geo: null,
  googleMapsUrl: null,

  /**
   * Horarios de EJEMPLO (hoursConfirmed=false) para que el sistema de turnos
   * funcione en la demo. Se muestran al público como "a confirmar".
   */
  hours: [
    { day: 1, ranges: [{ from: "09:00", to: "13:00" }, { from: "16:00", to: "20:00" }] },
    { day: 2, ranges: [{ from: "09:00", to: "13:00" }, { from: "16:00", to: "20:00" }] },
    { day: 3, ranges: [{ from: "09:00", to: "13:00" }, { from: "16:00", to: "20:00" }] },
    { day: 4, ranges: [{ from: "09:00", to: "13:00" }, { from: "16:00", to: "20:00" }] },
    { day: 5, ranges: [{ from: "09:00", to: "13:00" }, { from: "16:00", to: "20:00" }] },
    { day: 6, ranges: [{ from: "09:00", to: "13:00" }] },
  ],
  hoursConfirmed: false,
  areaServed: [],

  /** Paleta tomada del logo y del cartel del local. */
  colors: {
    primary: "#147a7f", // turquesa (texto blanco encima: contraste AA)
    primaryDark: "#0d5b5f",
    accent: "#c93a63", // rosa de los corazones (usar con moderación)
    warm: "#b98a5e", // marrón de las huellas
    surface: "#fbf7f0", // crema / madera clara
    ink: "#1c1b1f",
  },

  paymentMethods: ["efectivo", "transferencia", "mercadopago", "tarjeta_local"],
  bankTransferInfo: null,
  currency: "ARS",
};
