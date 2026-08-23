import type { MetadataRoute } from "next";
import { getWebOrigin, resolveStorefrontOrigin } from "./site-url.ts";

export function buildRobotsPolicy(input?: {
  storefrontHost?: string | null;
}): MetadataRoute.Robots {
  const storefrontHost = input?.storefrontHost ?? null;
  const origin = resolveStorefrontOrigin(storefrontHost);

  if (storefrontHost && !origin) {
    return {
      rules: {
        disallow: "/",
        userAgent: "*",
      },
    };
  }

  const publicOrigin = origin ?? getWebOrigin();

  return {
    host: publicOrigin,
    rules: {
      allow: "/",
      userAgent: "*",
    },
    sitemap: `${publicOrigin}/sitemap.xml`,
  };
}
