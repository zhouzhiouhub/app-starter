import { ResponsivePageRenderer } from "@app-starter/renderer";
import { resolveLocaleFromPath } from "@app-starter/schema";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../lib/page-metadata";
import { getPublishedPage } from "../../../lib/published-page";
import { getPublicTranslationMessages } from "../../../lib/public-translations";
import { getStorefrontOrigin } from "../../../lib/site-url";
import { readStorefrontRequestHost } from "../../../lib/storefront-request-host";

export async function generateMetadata(props: {
  params: Promise<{ locale: string; slug?: string[] }>;
}) {
  const params = await props.params;
  const storefrontHost = await readStorefrontRequestHost();

  return buildPageMetadata(
    await getPublishedPage({
      locale: resolveLocaleFromPath(params.locale),
      slug: params.slug?.join("/") ?? "home",
      storefrontHost,
    }),
    {
      origin: getStorefrontOrigin({ storefrontHost }),
    },
  );
}

export default async function LocalizedPage(props: {
  params: Promise<{ locale: string; slug?: string[] }>;
}) {
  const params = await props.params;
  const storefrontHost = await readStorefrontRequestHost();
  const locale = resolveLocaleFromPath(params.locale);
  const schema = await getPublishedPage({
    locale,
    slug: params.slug?.join("/") ?? "home",
    storefrontHost,
  });

  if (!schema) {
    notFound();
  }

  const translationMessages = await getPublicTranslationMessages({
    locale,
    storefrontHost,
  });

  return (
    <ResponsivePageRenderer
      schema={schema}
      translationMessages={translationMessages}
    />
  );
}
