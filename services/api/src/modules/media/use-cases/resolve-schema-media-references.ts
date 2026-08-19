import { Prisma } from "@prisma/client";
import {
  collectMediaReferences,
  pageSchema,
  readMediaAssetId,
  resolveMediaReferences,
  type PageSchema,
} from "@app-starter/schema";

type MediaAssetClient = Pick<Prisma.TransactionClient, "mediaAsset">;

export async function resolveSchemaMediaReferences(
  client: MediaAssetClient,
  schema: PageSchema,
  tenantId: string,
): Promise<PageSchema> {
  const references = collectMediaReferences(schema);

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
      url: true,
    },
  });
  const urlsByReference = new Map(
    assets.map((asset) => [`media://${asset.id}`, asset.url]),
  );

  return pageSchema.parse(
    resolveMediaReferences(
      schema,
      (reference) => urlsByReference.get(reference) ?? reference,
    ),
  );
}
