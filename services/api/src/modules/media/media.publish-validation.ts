import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  apiErrorCodes,
  collectMediaReferences,
  readMediaAssetId,
  type PageSchema,
} from "@app-starter/schema";
import { readArchivedAt } from "./media.metadata.js";

type MediaAssetClient = Pick<Prisma.TransactionClient, "mediaAsset">;

export async function assertSchemaMediaReferencesPublishable(
  client: MediaAssetClient,
  schema: PageSchema,
  tenantId: string,
): Promise<void> {
  const references = collectMediaReferences(schema);

  if (references.length === 0) {
    return;
  }

  const ids = references
    .map((reference) => readMediaAssetId(reference))
    .filter((id): id is string => Boolean(id));
  const assets = await client.mediaAsset.findMany({
    where: {
      id: { in: ids },
      tenantId,
    },
    select: {
      id: true,
      metadata: true,
    },
  });
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const missingReferences = references.filter((reference) => {
    const id = readMediaAssetId(reference);
    return !id || !assetsById.has(id);
  });
  const archivedReferences = references.filter((reference) => {
    const id = readMediaAssetId(reference);
    const asset = id ? assetsById.get(id) : undefined;
    return Boolean(asset && readArchivedAt(asset.metadata));
  });

  if (missingReferences.length > 0 || archivedReferences.length > 0) {
    throw new BadRequestException({
      code: apiErrorCodes.VALIDATION_ERROR,
      message: "Page references missing or archived media assets.",
      details: {
        archivedReferences,
        missingReferences,
      },
    });
  }
}
