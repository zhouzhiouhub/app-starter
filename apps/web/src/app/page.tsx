import { PageRenderer } from "@app-starter/renderer";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../lib/page-metadata";
import { getPublishedPage } from "../lib/published-page";

export async function generateMetadata() {
  return buildPageMetadata(
    await getPublishedPage({
      locale: "en-US",
      slug: "home",
    }),
  );
}

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
