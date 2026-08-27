import { formatRequestError } from "../../lib/api-error.ts";
import type { TranslationBulkLoadingAction } from "./translation-bulk-action.ts";
import { formatTranslationBulkRetryError } from "./translation-import-result-history.ts";

export function readTranslationBulkActionError(
  action: TranslationBulkLoadingAction,
  error: unknown,
): string {
  return formatTranslationBulkRetryError({
    action,
    message: formatTranslationBulkPreviewError(error),
  });
}

function formatTranslationBulkPreviewError(error: unknown): string {
  if (error instanceof SyntaxError) {
    return "Import preview JSON could not be parsed.";
  }

  return formatRequestError(error);
}
