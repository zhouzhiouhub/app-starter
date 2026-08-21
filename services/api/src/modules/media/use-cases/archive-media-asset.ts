import {
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { runTenantIdempotent } from "../../../common/idempotency-record.js";
import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import {
  readArchivedAt,
  writeArchiveMetadata,
} from "../media.metadata.js";
import { createMediaAssetResponse } from "../media.responses.js";
import { findMediaUsage } from "../media.usage.js";

export function archiveMediaAsset(
  prisma: PrismaService,
  id: string,
  actor: Actor,
  idempotencyKey: string | undefined,
  requestId = "local-dev",
) {
  return runTenantIdempotent(prisma, {
    body: { id },
    key: idempotencyKey,
    scope: `media:${id}:archive`,
    tenantId: actor.tenantId,
    operation: () => archiveAsset(prisma, id, actor, requestId),
  });
}

async function archiveAsset(
  prisma: PrismaService,
  id: string,
  actor: Actor,
  requestId: string,
) {
  const asset = await prisma.mediaAsset.findFirst({
    where: {
      id,
      tenantId: actor.tenantId,
    },
  });

  if (!asset) {
    throw new NotFoundException({
      code: apiErrorCodes.NOT_FOUND,
      message: "Media asset was not found.",
    });
  }

  if (readArchivedAt(asset.metadata)) {
    return createMediaAssetResponse(asset, actor.tenantId, requestId);
  }

  const usage = await findMediaUsage(prisma, {
    mediaAssetId: asset.id,
    tenantId: actor.tenantId,
  });

  if (usage.length > 0) {
    throw new ConflictException({
      code: apiErrorCodes.CONFLICT,
      message: "Media asset is still referenced by page versions.",
      details: {
        usage: usage.slice(0, 10),
      },
    });
  }

  const archived = await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: {
      metadata: writeArchiveMetadata({
        actorId: actor.id,
        metadata: asset.metadata,
      }),
    },
  });

  return createMediaAssetResponse(archived, actor.tenantId, requestId);
}
