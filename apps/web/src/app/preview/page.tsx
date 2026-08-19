import { ResponsivePageRenderer } from "@app-starter/renderer";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPreviewPage } from "../../lib/published-page";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "Preview",
};

export default async function PreviewPage(props: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const searchParams = await props.searchParams;
  const token = Array.isArray(searchParams.token)
    ? searchParams.token[0]
    : searchParams.token;

  if (!token) {
    notFound();
  }

  const schema = await getPreviewPage(token);

  if (!schema) {
    notFound();
  }

  return <ResponsivePageRenderer schema={schema} />;
}
