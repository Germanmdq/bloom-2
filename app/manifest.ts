import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bloom Café & POS',
    short_name: 'Bloom',
    description: 'Sistema de Gestión Integral para Gastronomía y Menú Digital de Bloom Café',
    start_url: '/',
    id: '/',
    display: 'standalone',
    background_color: '#fffdf8',
    theme_color: '#1a3028',
    orientation: 'any',
    scope: '/',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Mesas / Salón (POS)',
        short_name: 'Mesas',
        description: 'Abrir punto de venta y gestión de mesas',
        url: '/dashboard/tables',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Comandas de Cocina',
        short_name: 'Cocina',
        description: 'Ver comandas y pedidos en preparación',
        url: '/dashboard/kitchen',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Menú Digital',
        short_name: 'Menú',
        description: 'Carta digital para clientes y pedidos',
        url: '/menu',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  };
}
