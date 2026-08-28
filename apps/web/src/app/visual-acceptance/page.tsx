import { PageRenderer } from "@app-starter/renderer";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  createPageBuilderVisualFixtureSchema,
  isPageBuilderVisualFixtureEnabled,
  readPageBuilderVisualFixtureViewport,
  resolvePageBuilderVisualFixtureMediaUrl,
} from "../../lib/page-builder-visual-fixture";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "Page Builder Visual Acceptance",
};

export default async function PageBuilderVisualAcceptancePage(props: {
  searchParams: Promise<{ viewport?: string | string[] }>;
}) {
  if (!isPageBuilderVisualFixtureEnabled()) {
    notFound();
  }

  const searchParams = await props.searchParams;
  const viewport = readPageBuilderVisualFixtureViewport(searchParams.viewport);

  return (
    <PageRenderer
      resolveMediaUrl={resolvePageBuilderVisualFixtureMediaUrl}
      schema={createPageBuilderVisualFixtureSchema()}
      viewport={viewport}
    />
  );
}
