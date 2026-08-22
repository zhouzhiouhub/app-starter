import { ResponsivePageRenderer } from "@app-starter/renderer";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPreviewPage } from "../../lib/published-page";
import { readPreviewTokenParam } from "../../lib/preview-token-param";
import { readStorefrontRequestHost } from "../../lib/storefront-request-host";

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

  const storefrontHost = await readStorefrontRequestHost();
  const schema = await getPreviewPage(token, { storefrontHost });

  if (!schema) {
    notFound();
  }

  return <ResponsivePageRenderer schema={schema} />;
}
