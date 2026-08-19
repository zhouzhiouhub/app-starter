import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { storefrontRevalidateSecretHeader } from "@app-starter/schema";
import { readRevalidatePayload } from "../../../lib/revalidate-request";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const requestId = readRequestId(request);
  const configuredSecret =
    process.env.STOREFRONT_REVALIDATE_SECRET?.trim() ?? "";

  if (!configuredSecret) {
    return errorResponse({
      code: "REVALIDATE_NOT_CONFIGURED",
      details: {
        env: "STOREFRONT_REVALIDATE_SECRET",
      },
      message: "Storefront revalidation is not configured.",
      requestId,
      status: 503,
    });
  }

  if (
    request.headers.get(storefrontRevalidateSecretHeader) !== configuredSecret
  ) {
    return errorResponse({
      code: "UNAUTHORIZED",
      details: {
        header: storefrontRevalidateSecretHeader,
      },
      message: "Invalid revalidation secret.",
      requestId,
      status: 401,
    });
  }

  const payload = await readRevalidatePayload(request);

  if (!payload.ok) {
    return errorResponse({
      ...payload.error,
      requestId,
      status: 400,
    });
  }

  const { input, paths, tags } = payload;

  for (const tag of tags) {
    revalidateTag(tag);
  }

  for (const path of paths) {
    revalidatePath(path);
  }

  return NextResponse.json({
    data: {
      paths,
      tags,
      revalidated: true,
    },
    meta: {
      requestId,
      locale: input.locale,
      market: input.market,
    },
  });
}

function readRequestId(request: NextRequest): string {
  return request.headers.get("x-request-id")?.trim() || "local-dev";
}

function errorResponse(input: {
  code: string;
  details?: unknown;
  message: string;
  requestId: string;
  status: number;
}) {
  return NextResponse.json(
    {
      error: {
        code: input.code,
        details: input.details,
        message: input.message,
        requestId: input.requestId,
      },
    },
    { status: input.status },
  );
}
