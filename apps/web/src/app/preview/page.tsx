import { ResponsivePageRenderer } from "@app-starter/renderer";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPreviewPage } from "../../lib/published-page";
import { readPreviewTokenParam } from "../../lib/preview-token-param";

export const dynamic = "force-dynamic";

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
  const token = readPreviewTokenParam(searchParams.token);

  if (!token) {
    notFound();
  }

  const schema = await getPreviewPage(token);

  if (!schema) {
    notFound();
  }

  return <ResponsivePageRenderer schema={schema} />;
}
