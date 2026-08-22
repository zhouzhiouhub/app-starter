import { toMediaAssetResponse } from "./media.mapper.js";

export function createMediaAssetResponse(
  asset: Parameters<typeof toMediaAssetResponse>[0],
  tenantId: string,
  requestId = "local-dev",
) {
  return {
    data: toMediaAssetResponse(asset),
    meta: {
      requestId,
      tenantId,
    },
  };
}
