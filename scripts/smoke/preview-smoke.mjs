import {
  ensureSmokePage,
  saveDraft,
} from "./preview-smoke-page-api.mjs";
import {
  assertPublicPreview,
  assertWebPreview,
  formatWebPreviewAttempt,
  getPreviewPath,
  readWebPreviewAttempt,
} from "./preview-smoke-render-checks.mjs";
import {
  createPreviewToken,
  isPreviewTokenShape,
} from "./preview-smoke-token-api.mjs";

export {
  formatWebPreviewAttempt,
  getPreviewPath,
  isPreviewTokenShape,
  readWebPreviewAttempt,
};

export async function assertPreviewFlow(input, accessToken, schema, title) {
  const page = await ensureSmokePage(input, accessToken, title);

  await saveDraft(input, accessToken, page.id, schema, title);
  const preview = await createPreviewToken(input, accessToken, page.id);
  await assertPublicPreview(input, preview.token, title);
  await assertWebPreview(input, preview.token, title);

  return page;
}
