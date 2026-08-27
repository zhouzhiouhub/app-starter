import type { UpsertDefaultTranslationResult } from "./types.ts";

export function formatDefaultTranslationSaveMessage(input: {
  locale: string;
  result: UpsertDefaultTranslationResult;
  willLocateEntry?: boolean;
}): string {
  const action =
    input.result.writeMode === "updated" ? "Updated existing" : "Saved new";
  const locationHint = input.willLocateEntry
    ? " The translations table is focused on this key."
    : "";

  return `${action} ${input.result.entry.key} for ${input.locale}.${locationHint}`;
}
