import { Buffer } from "node:buffer";
import {
  assertMediaAssetShape,
  confirmSmokeImage,
} from "./media-smoke-confirmation.mjs";
import { assertMediaListFilters } from "./media-smoke-list-filter.mjs";
import { uploadSmokeImage } from "./media-smoke-r2-upload.mjs";
import { requestMediaUploadTarget } from "./media-smoke-upload-target.mjs";

const smokeImage = {
  body: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgF/6YxS7wAAAABJRU5ErkJggg==",
    "base64",
  ),
  filename: `smoke-${Date.now().toString(36)}.png`,
  metadata: {
    alt: "Smoke test pixel",
    height: 1,
    width: 1,
  },
  mimeType: "image/png",
};

export async function createSmokeMediaAsset(input, accessToken) {
  const expectedCdnHost = input.expectedMediaCdnHost ?? null;
  const target = await requestMediaUploadTarget(input, accessToken, smokeImage);

  if (input.requireR2Upload) {
    await uploadSmokeImage(target, smokeImage);
  }

  const asset = await confirmSmokeImage(
    input,
    accessToken,
    target,
    smokeImage,
  );
  assertMediaAssetShape(
    asset,
    target,
    smokeImage,
    input.requireR2Upload,
    expectedCdnHost,
  );
  await assertMediaListFilters(input, accessToken, asset);

  return { asset, target };
}
