import type { MetadataRoute } from "next";
import { buildRobotsPolicy } from "../lib/robots-policy";
import { readStorefrontRequestHost } from "../lib/storefront-request-host";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const storefrontHost = await readStorefrontRequestHost();
  return buildRobotsPolicy({ storefrontHost });
}
