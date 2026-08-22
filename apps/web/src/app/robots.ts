import type { MetadataRoute } from "next";
import { getStorefrontOrigin } from "../lib/site-url";
import { readStorefrontRequestHost } from "../lib/storefront-request-host";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const storefrontHost = await readStorefrontRequestHost();
  const origin = getStorefrontOrigin({ storefrontHost });

  return {
    host: origin,
    rules: {
      allow: "/",
      userAgent: "*",
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
