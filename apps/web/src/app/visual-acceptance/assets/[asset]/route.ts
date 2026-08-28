import {
  isPageBuilderVisualFixtureEnabled,
} from "../../../../lib/page-builder-visual-fixture.ts";
import {
  readPageBuilderVisualFixtureAsset,
} from "../../../../lib/page-builder-visual-fixture-assets.ts";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  props: { params: Promise<{ asset: string }> },
) {
  if (!isPageBuilderVisualFixtureEnabled()) {
    return notFoundResponse();
  }

  const params = await props.params;
  const asset = readPageBuilderVisualFixtureAsset(params.asset);

  if (!asset) {
    return notFoundResponse();
  }

  return new Response(asset.body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": asset.contentType,
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function notFoundResponse(): Response {
  return new Response("Not Found", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
    status: 404,
  });
}
