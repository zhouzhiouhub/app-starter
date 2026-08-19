import { Prisma } from "@prisma/client";
import type { Actor } from "../../identity/identity.types.js";
import { toMediaAssetResponse } from "../media.mapper.js";
import { parseListMediaQuery } from "../media.validation.js";

type MediaAssetClient = Pick<Prisma.TransactionClient, "mediaAsset">;

export async function listMediaAssets(
  client: MediaAssetClient,
  query: {
    page?: string | number;
    limit?: string | number;
    status?: string;
    type?: string;
  },
  actor: Actor,
) {
  const { page, limit, status, type } = parseListMediaQuery(query);
  const skip = (page - 1) * limit;
  const where: Prisma.MediaAssetWhereInput = {
    tenantId: actor.tenantId,
    ...(type ? { type } : {}),
  };

  const assets = await client.mediaAsset.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  const filtered = assets
    .map(toMediaAssetResponse)
    .filter((asset) => status === "all" || asset.status === status);

  return {
    data: filtered.slice(skip, skip + limit),
    meta: {
      requestId: "local-dev",
      tenantId: actor.tenantId,
      total: filtered.length,
      page,
      limit,
    },
  };
}
