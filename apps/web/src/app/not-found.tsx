import { ResponsivePageRenderer } from "@app-starter/renderer";
import type { Metadata } from "next";
import { getNotFoundPage } from "../lib/published-page";
import { getPublicTranslationMessages } from "../lib/public-translations";
import { readStorefrontRequestHost } from "../lib/storefront-request-host";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "Page not found",
};

export default async function NotFoundPage() {
  const storefrontHost = await readStorefrontRequestHost();
  const schema = await getNotFoundPage({
    locale: "en-US",
    storefrontHost,
  });
  const translationMessages = await getPublicTranslationMessages({
    locale: schema.meta.locale,
    storefrontHost,
  });

  return (
    <ResponsivePageRenderer
      schema={schema}
      translationMessages={translationMessages}
    />
  );
}
