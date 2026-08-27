import { useEffect, useState } from "react";
import {
  formatTranslationBulkRepairServerConfirmationMessage,
  readTranslationBulkRepairRemainingKeys,
} from "../translation-import-result-history";

export interface TranslationBulkRepairNotice {
  message: string;
  type: "success" | "warning";
}

export function useTranslationBulkRepairConfirmation(input: {
  locale: string;
  missingKeys?: string[];
  requestId?: string;
}) {
  const confirmationVersion = readConfirmationVersion(input);
  const [notice, setNotice] = useState<TranslationBulkRepairNotice | null>(
    null,
  );
  const [pending, setPending] = useState<{
    baselineVersion: string;
    focusKey: string | null;
    keys: string[];
  } | null>(null);

  useEffect(() => {
    if (!pending) {
      return;
    }

    if (pending.baselineVersion === confirmationVersion) {
      return;
    }

    const message = formatTranslationBulkRepairServerConfirmationMessage({
      focusKey: pending.focusKey,
      locale: input.locale,
      missingKeys: input.missingKeys,
      repairedKeys: pending.keys,
    });

    if (!message) {
      return;
    }

    const remainingKeys = readTranslationBulkRepairRemainingKeys({
      missingKeys: input.missingKeys,
      repairedKeys: pending.keys,
    });

    setNotice({
      message,
      type: remainingKeys.length > 0 ? "warning" : "success",
    });

    if (remainingKeys.length === 0) {
      setPending(null);
    }
  }, [confirmationVersion, input.locale, input.missingKeys, pending]);

  function begin(keys: string[], focusKey: string | null) {
    setNotice(null);
    setPending(
      keys.length > 0
        ? {
            baselineVersion: confirmationVersion,
            focusKey,
            keys,
          }
        : null,
    );
  }

  function clear() {
    setNotice(null);
    setPending(null);
  }

  return { begin, clear, notice };
}

function readConfirmationVersion(input: {
  missingKeys?: string[];
  requestId?: string;
}): string {
  return input.requestId ?? (input.missingKeys ?? []).join("\n");
}
