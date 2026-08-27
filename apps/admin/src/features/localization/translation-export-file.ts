import type { TranslationExportResult } from "./types";

const defaultExportContentType = "application/json";

export interface TranslationExportFile {
  contentType: string;
  filename: string;
  text: string;
}

export function createTranslationExportFile(
  exportResult: TranslationExportResult,
): TranslationExportFile {
  return {
    contentType: exportResult.contentType || defaultExportContentType,
    filename: readSafeExportFilename(exportResult),
    text: JSON.stringify(toExportEnvelope(exportResult), null, 2),
  };
}

export function downloadTranslationExport(
  exportResult: TranslationExportResult,
): void {
  const file = createTranslationExportFile(exportResult);
  const blob = new Blob([file.text], { type: file.contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = file.filename;
  anchor.rel = "noopener";

  try {
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toExportEnvelope(exportResult: TranslationExportResult) {
  return {
    entries: exportResult.entries,
    entryCount: exportResult.entryCount,
    expectedKeyCount: exportResult.expectedKeyCount,
    exportVersion: exportResult.exportVersion,
    locale: exportResult.locale,
    missingKeyCount: exportResult.missingKeyCount,
    missingKeyPreviewLimit: exportResult.missingKeyPreviewLimit,
    missingKeys: exportResult.missingKeys,
  };
}

function readSafeExportFilename(exportResult: TranslationExportResult): string {
  const locale = /^[a-zA-Z0-9-]+$/.test(exportResult.locale)
    ? exportResult.locale
    : "en-US";

  return /^[a-zA-Z0-9._-]+\.json$/.test(exportResult.filename)
    ? exportResult.filename
    : `translations-${locale}.json`;
}
