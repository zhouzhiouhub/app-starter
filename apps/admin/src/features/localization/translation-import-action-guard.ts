import type { TranslationBulkLoadingAction } from "./translation-bulk-action.ts";
import {
  readTranslationImportTemplateEmptyStateMessage,
  summarizeTranslationImportTemplate,
} from "./translation-import-template-summary.ts";

type TranslationImportDraftAction = Extract<
  TranslationBulkLoadingAction,
  "import" | "preview-import"
>;

export function readTranslationImportDraftActionGuard(input: {
  action: TranslationImportDraftAction;
  defaultLocale: string;
  importText: string;
  missingKeys?: string[];
}): string | null {
  const summary = summarizeTranslationImportTemplate({
    defaultLocale: input.defaultLocale,
    importText: input.importText,
    missingKeys: input.missingKeys,
  });
  const emptyMessage = readTranslationImportTemplateEmptyStateMessage({
    defaultLocale: input.defaultLocale,
    summary,
  });

  if (!emptyMessage) {
    return null;
  }

  return `${emptyMessage} ${readActionLabel(input.action)} was not run.`;
}

function readActionLabel(action: TranslationImportDraftAction): string {
  return action === "preview-import" ? "Preview import" : "Import";
}
