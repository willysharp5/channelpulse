import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/privacy", "/terms"],
        disallow: [
          "/login",
          "/signup",
          "/billing",
          "/settings",
          "/inventory",
          "/orders",
          "/revenue",
          "/channels",
          "/onboarding",
          "/admin",
          "/verify-email",
          "/api/",
          "/demo",
        ],
      },
    ],
    sitemap: "https://channelpulse.us/sitemap.xml",
  };
}
