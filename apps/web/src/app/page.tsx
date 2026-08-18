import { PageRenderer } from "@app-starter/renderer";
import { notFound } from "next/navigation";
import { getPublishedPage } from "../lib/published-page";

export default async function HomePage() {
  const schema = await getPublishedPage({
    locale: "en-US",
    slug: "home",
  });

  if (!schema) {
    notFound();
  }

  return <PageRenderer schema={schema} viewport="desktop" />;
}
