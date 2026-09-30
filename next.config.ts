import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  images: {
    // AVIF/WebP automáticos para las imágenes optimizadas por next/image.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        // El SW de la veterinaria controla /veterinaria (incluida la portada sin barra final).
        source: "/veterinaria/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/veterinaria" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
