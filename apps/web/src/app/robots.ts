import type { MetadataRoute } from "next";
import { getWebOrigin } from "../lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const origin = getWebOrigin();

  return {
    host: origin,
    rules: {
      allow: "/",
      userAgent: "*",
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
