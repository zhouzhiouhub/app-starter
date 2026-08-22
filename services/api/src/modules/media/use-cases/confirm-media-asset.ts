import { Prisma } from "@prisma/client";
import { runTenantIdempotent } from "../../../common/idempotency-record.js";
import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { inferMediaAssetType } from "../media.mapper.js";
import { createMediaAssetResponse } from "../media.responses.js";
import { createMediaCdnUrl } from "../media.upload-target.js";
import {
  assertAllowedExternalMediaUrl,
  assertTenantR2Key,
  parseConfirmMediaInput,
} from "../media.validation.js";

export async function confirmMediaAsset(
  prisma: PrismaService,
  body: unknown,
  idempotencyKey: string | undefined,
  actor: Actor,
  requestId = "local-dev",
) {
  const input = parseConfirmMediaInput(body);
  assertTenantR2Key(input.r2Key, actor.tenantId);
  if (input.url) {
    assertAllowedExternalMediaUrl(input.url);
  }

  return runTenantIdempotent(prisma, {
    body: input,
    key: idempotencyKey,
    scope: `media:${input.r2Key}:confirm`,
    tenantId: actor.tenantId,
    operation: async () => {
      const existing = await prisma.mediaAsset.findFirst({
        where: {
          r2Key: input.r2Key,
          tenantId: actor.tenantId,
        },
      });

      if (existing) {
        return createMediaAssetResponse(existing, actor.tenantId, requestId);
      }

      const asset = await prisma.mediaAsset.create({
        data: {
          tenantId: actor.tenantId,
          type: inferMediaAssetType(input.mimeType),
          filename: input.filename,
          url: input.url ?? createMediaCdnUrl(input.r2Key),
          r2Key: input.r2Key,
          size: BigInt(input.size),
          mimeType: input.mimeType,
          metadata: input.metadata as Prisma.InputJsonValue,
        },
      });

      return createMediaAssetResponse(asset, actor.tenantId, requestId);
    },
  });
}
