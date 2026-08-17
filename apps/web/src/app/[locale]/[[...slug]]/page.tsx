import { PageRenderer } from "@app-starter/renderer";
import { exampleLandingPage } from "@app-starter/schema";
import { getPublishedPage } from "../../../lib/published-page";

export default async function LocalizedPage(props: {
  params: Promise<{ locale: string; slug?: string[] }>;
}) {
  const params = await props.params;
  const schema = await getPublishedPage({
    locale: params.locale,
    slug: params.slug?.join("/") ?? "home"
  });

  return <PageRenderer schema={schema ?? exampleLandingPage} viewport="desktop" />;
}
