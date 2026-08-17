import { PageRenderer } from "@app-starter/renderer";
import { exampleLandingPage } from "@app-starter/schema";
import { getPublishedPage } from "../lib/published-page";

export default async function HomePage() {
  const schema = await getPublishedPage({
    locale: "en-US",
    slug: "home"
  });

  return <PageRenderer schema={schema ?? exampleLandingPage} viewport="desktop" />;
}
