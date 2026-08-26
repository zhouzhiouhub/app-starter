import { formatSmokeText } from "./smoke-text.mjs";

const fallbackSmokeErrorMessage = "Unknown smoke failure.";
const maxSmokeErrorMessageLength = 520;

export function readErrorMessage(error) {
  return formatSmokeText(error instanceof Error ? error.message : error, {
    fallback: fallbackSmokeErrorMessage,
    maxLength: maxSmokeErrorMessageLength,
  });
}
