import { Prisma } from "@prisma/client";
import type { Actor } from "../../identity/identity.types.js";
import { toMediaAssetResponse } from "../media.mapper.js";
import { parseListMediaQuery } from "../media.validation.js";

type MediaAssetModel = Pick<
  Prisma.TransactionClient["mediaAsset"],
  "count" | "findMany"
>;
type MediaAssetClient = {
  mediaAsset: MediaAssetModel;
};
type MediaListStatus = "active" | "archived" | "all";

export async function listMediaAssets(
  client: MediaAssetClient,
  query: {
    page?: string | number;
    limit?: string | number;
    status?: string;
    type?: string;
  },
  actor: Actor,
  requestId = "local-dev",
) {
  const { page, limit, status, type } = parseListMediaQuery(query);
  const skip = (page - 1) * limit;
  const where = buildMediaAssetListWhere({
    status,
    tenantId: actor.tenantId,
    type,
  });
  const [total, assets] = await Promise.all([
    client.mediaAsset.count({ where }),
    client.mediaAsset.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      where,
    }),
  ]);

  return {
    data: assets.map(toMediaAssetResponse),
    meta: {
      requestId,
      tenantId: actor.tenantId,
      total,
      page,
      limit,
    },
  };
}

function buildMediaAssetListWhere(input: {
  status: MediaListStatus;
  tenantId: string;
  type?: string;
}): Prisma.MediaAssetWhereInput {
  const where: Prisma.MediaAssetWhereInput = {
    tenantId: input.tenantId,
    ...(input.type ? { type: input.type } : {}),
  };

  if (input.status === "all") {
    return where;
  }

  const archivedAtFilter = readArchivedAtPresenceFilter();

  if (input.status === "archived") {
    return { ...where, ...archivedAtFilter };
  }

  return {
    ...where,
    NOT: archivedAtFilter,
  };
}

function readArchivedAtPresenceFilter(): Prisma.MediaAssetWhereInput {
  return {
    metadata: {
      path: ["archivedAt"],
      string_contains: "",
    },
  };
}
