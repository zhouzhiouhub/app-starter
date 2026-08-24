import { Prisma } from "@prisma/client";
import {
  collectMediaReferences,
  pageMediaReferenceMaxCount,
  pageSchema,
  readMediaAssetId,
  resolveMediaReferences,
  type PageSchema,
} from "@app-starter/schema";
import { readArchivedAt } from "../media.metadata.js";
import { assertAllowedMediaUrl } from "../media.url-validation.js";

type MediaAssetClient = Pick<Prisma.TransactionClient, "mediaAsset">;

export async function resolveSchemaMediaReferences(
  client: MediaAssetClient,
  schema: PageSchema,
  tenantId: string,
): Promise<PageSchema> {
  const references = collectMediaReferences(schema, {
    maxCount: pageMediaReferenceMaxCount,
  });

  if (references.length === 0) {
    return schema;
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
      url: true,
    },
  });
  const urlsByReference = new Map<string, string>(
    assets.flatMap((asset): Array<[string, string]> => {
      if (
        readArchivedAt(asset.metadata) ||
        !isAllowedResolvedMediaUrl(asset.url)
      ) {
        return [];
      }

      return [[`media://${asset.id}`, asset.url]];
    }),
  );

  return pageSchema.parse(
    resolveMediaReferences(
      schema,
      (reference) => urlsByReference.get(reference) ?? reference,
    ),
  );
}

function isAllowedResolvedMediaUrl(url: string): boolean {
  try {
    assertAllowedMediaUrl(url);
    return true;
  } catch {
    return false;
  }
}
