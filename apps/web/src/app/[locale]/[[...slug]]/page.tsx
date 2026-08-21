import { ResponsivePageRenderer } from "@app-starter/renderer";
import { resolveLocaleFromPath } from "@app-starter/schema";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../lib/page-metadata";
import { getPublishedPage } from "../../../lib/published-page";
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
  );
}

export default async function LocalizedPage(props: {
  params: Promise<{ locale: string; slug?: string[] }>;
}) {
  const params = await props.params;
  const storefrontHost = await readStorefrontRequestHost();
  const schema = await getPublishedPage({
    locale: resolveLocaleFromPath(params.locale),
    slug: params.slug?.join("/") ?? "home",
    storefrontHost,
  });

  if (!schema) {
    notFound();
  }

  return <ResponsivePageRenderer schema={schema} />;
}
