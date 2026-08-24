import { createMediaSmokeDetails } from "./media-smoke-diagnostics.mjs";
import { createSmokeMediaAsset } from "./media-smoke-upload-flow.mjs";

export {
  createMediaUploadTargetSmokeDetails,
  createMediaSmokeDetails,
  formatMediaListFilterDiagnostic,
  isCdnUrlForR2Key,
  isMediaListResponseContainingAsset,
  isMediaReference,
  isProductionCdnUrl,
  isR2UploadUrl,
  isR2UploadUrlForKey,
  readMediaListFilterDiagnostic,
} from "./media-smoke-diagnostics.mjs";

export async function assertMediaUploadTarget(input, accessToken) {
  const { asset, target } = await createSmokeMediaAsset(input, accessToken);

  console.log(
    input.requireR2Upload
      ? "Media R2 upload, CDN confirmation, and list filters passed."
      : "Media upload target, confirm, and list filters passed.",
  );

  return createMediaSmokeDetails(target, asset, input.requireR2Upload);
}
