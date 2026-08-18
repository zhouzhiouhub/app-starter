import { PageRenderer } from "@app-starter/renderer";
import { resolveLocaleFromPath } from "@app-starter/schema";
import { notFound } from "next/navigation";
import { getPublishedPage } from "../../../lib/published-page";

export default async function LocalizedPage(props: {
  params: Promise<{ locale: string; slug?: string[] }>;
}) {
  const params = await props.params;
  const schema = await getPublishedPage({
    locale: resolveLocaleFromPath(params.locale),
    slug: params.slug?.join("/") ?? "home"
  });

  if (!schema) {
    notFound();
  }

  return <PageRenderer schema={schema} viewport="desktop" />;
}
