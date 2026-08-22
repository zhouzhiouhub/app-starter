import { runTenantIdempotent } from "../../../common/idempotency-record.js";
import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { MEDIA_MAX_UPLOAD_BYTES } from "../media.constants.js";
import {
  createMediaR2Key,
  inferMediaAssetType,
} from "../media.mapper.js";
import type { MediaUploadUrlResponse } from "../media.types.js";
import { createMediaUploadTarget } from "../media.upload-target.js";
import { parseCreateUploadUrlInput } from "../media.validation.js";

export function createMediaUploadUrl(
  prisma: PrismaService,
  body: unknown,
  idempotencyKey: string | undefined,
  actor: Actor,
  requestId = "local-dev",
) {
  const input = parseCreateUploadUrlInput(body);

  return runTenantIdempotent(prisma, {
    body: input,
    key: idempotencyKey,
    scope: "media:upload-url",
    storeResponse: false,
    tenantId: actor.tenantId,
    operation: () => {
      const r2Key = createMediaR2Key({
        filename: input.filename,
        tenantId: actor.tenantId,
      });
      const uploadTarget = createMediaUploadTarget({
        mimeType: input.mimeType,
        r2Key,
      });

      return Promise.resolve({
        data: {
          uploadUrl: uploadTarget.uploadUrl,
          method: "PUT",
          r2Key,
          type: inferMediaAssetType(input.mimeType),
          headers: uploadTarget.headers,
          maxSize: MEDIA_MAX_UPLOAD_BYTES,
          expiresAt: uploadTarget.expiresAt.toISOString(),
          confirmPath: "/api/v1/media/confirm",
        } satisfies MediaUploadUrlResponse,
        meta: {
          requestId,
          tenantId: actor.tenantId,
        },
      });
    },
  });
}
