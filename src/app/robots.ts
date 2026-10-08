import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/account", "/checkout", "/cart", "/wishlist", "/search", "/login", "/register", "/reset-password", "/forgot-password"],
      },
    ],
    sitemap: siteUrl("/sitemap.xml"),
  };
}
