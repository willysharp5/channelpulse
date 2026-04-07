import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/landing", "/about", "/privacy", "/terms", "/"],
        disallow: [
          "/api/",
          "/admin/",
          "/(auth)/",
          "/onboarding",
          "/settings",
          "/billing",
          "/import",
          "/orders",
          "/products",
          "/inventory",
          "/revenue",
          "/pnl",
          "/chat",
          "/channels",
          "/demo/",
        ],
      },
    ],
    sitemap: "https://channelpulse.us/sitemap.xml",
    host: "https://channelpulse.us",
  };
}
