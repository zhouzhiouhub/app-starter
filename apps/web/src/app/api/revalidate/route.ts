import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { storefrontRevalidateSecretHeader } from "@app-starter/schema";
import { readRevalidatePayload } from "../../../lib/revalidate-request";
import { readRevalidateRequestId } from "../../../lib/revalidate-request-id";
import {
  createRevalidateErrorBody,
  createRevalidateResponseInit,
} from "../../../lib/revalidate-response";
import { runRevalidationOperations } from "../../../lib/revalidate-executor";
import {
  hasValidRevalidateSecret,
  readConfiguredRevalidateSecret,
} from "../../../lib/revalidate-secret";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const requestId = readRequestId(request);
  const configuredSecret = readConfiguredRevalidateSecret();

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
    !hasValidRevalidateSecret({
      configuredSecret,
      providedSecret: request.headers.get(storefrontRevalidateSecretHeader),
    })
  ) {
    return errorResponse({
      code: "UNAUTHORIZED",
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
  const revalidation = runRevalidationOperations({
    paths,
    revalidatePath,
    revalidateTag,
    tags,
  });

  if (!revalidation.ok) {
    return errorResponse({
      code: "REVALIDATE_FAILED",
      details: revalidation.error,
      message: "Storefront revalidation failed.",
      requestId,
      status: 500,
    });
  }

  return NextResponse.json(
    {
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
    },
    createRevalidateResponseInit(),
  );
}

function readRequestId(request: NextRequest): string {
  return readRevalidateRequestId(request.headers.get("x-request-id"));
}

function errorResponse(input: {
  code: string;
  details?: unknown;
  message: string;
  requestId: string;
  status: number;
}) {
  return NextResponse.json(
    createRevalidateErrorBody(input),
    createRevalidateResponseInit({ status: input.status }),
  );
}
