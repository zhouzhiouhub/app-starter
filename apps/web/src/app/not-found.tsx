import { ResponsivePageRenderer } from "@app-starter/renderer";
import { createFallbackPage } from "@app-starter/schema";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "Page not found",
};

export default function NotFoundPage() {
  return (
    <ResponsivePageRenderer
      schema={createFallbackPage({ slug: "404" })}
      translationMessages={{}}
    />
  );
}
