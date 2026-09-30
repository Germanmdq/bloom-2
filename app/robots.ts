import type { MetadataRoute } from "next";
import { INTEGRATIONS } from "@/lib/vet/config/integrations";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Paneles internos y flujos privados fuera del índice.
        disallow: ["/api/", "/dashboard", "/veterinaria/admin", "/veterinaria/checkout", "/veterinaria/carrito", "/veterinaria/cuenta", "/veterinaria/pedido/"],
      },
    ],
    sitemap: [`${INTEGRATIONS.siteUrl}/veterinaria/sitemap.xml`],
  };
}
