import { PageRenderer } from "@app-starter/renderer";
import type { Metadata } from "next";
import { getNotFoundPage } from "../lib/published-page";

export const metadata: Metadata = {
  title: "Page not found",
};

export default async function NotFoundPage() {
  const schema = await getNotFoundPage({
    locale: "en-US",
  });

  return <PageRenderer schema={schema} viewport="desktop" />;
}
