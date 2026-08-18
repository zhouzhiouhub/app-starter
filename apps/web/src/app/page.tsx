import { PageRenderer } from "@app-starter/renderer";
import { getPublishedPage } from "../lib/published-page";

export default async function HomePage() {
  const schema = await getPublishedPage({
    locale: "en-US",
    slug: "home"
  });

  return <PageRenderer schema={schema} viewport="desktop" />;
}
