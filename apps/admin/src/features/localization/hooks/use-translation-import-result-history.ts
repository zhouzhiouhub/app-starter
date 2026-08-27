import { useRef, useState } from "react";
import {
  addTranslationImportResultHistoryEntry,
  clearTranslationImportResultHistory,
  createTranslationImportResultHistoryEntry,
  type TranslationImportResultHistoryEntry,
} from "../translation-import-result-history";
import type { TranslationImportResult } from "../types";

export function useTranslationImportResultHistory() {
  const [importResultHistory, setImportResultHistory] = useState<
    TranslationImportResultHistoryEntry[]
  >([]);
  const importSequenceRef = useRef(0);

  function clearImportResultHistory() {
    setImportResultHistory(clearTranslationImportResultHistory());
  }

  function recordImportResult(result: TranslationImportResult) {
    importSequenceRef.current += 1;
    const entry = createTranslationImportResultHistoryEntry(
      result,
      importSequenceRef.current,
    );

    setImportResultHistory((current) =>
      addTranslationImportResultHistoryEntry(current, entry),
    );
  }

  return {
    clearImportResultHistory,
    importResultHistory,
    recordImportResult,
  };
}
