import { PageRenderer } from "@app-starter/renderer";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../lib/page-metadata";
import { getPublishedPage } from "../lib/published-page";
import { getStorefrontOrigin } from "../lib/site-url";
import { readStorefrontRequestHost } from "../lib/storefront-request-host";

export async function generateMetadata() {
  const storefrontHost = await readStorefrontRequestHost();

  return buildPageMetadata(
    await getPublishedPage({
      locale: "en-US",
      slug: "home",
      storefrontHost,
    }),
    {
      origin: getStorefrontOrigin({ storefrontHost }),
    },
  );
}

export default async function HomePage() {
  const storefrontHost = await readStorefrontRequestHost();
  const schema = await getPublishedPage({
    locale: "en-US",
    slug: "home",
    storefrontHost,
  });

  if (!schema) {
    notFound();
  }

  return <PageRenderer schema={schema} viewport="desktop" />;
}
