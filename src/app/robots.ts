import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  // Preview/demo deployments stay out of search engines entirely.
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return { rules: [{ userAgent: "*", disallow: "/" }] };
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
