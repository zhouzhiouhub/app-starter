import { redactSmokeSecrets } from "./smoke-secrets.mjs";

const fallbackSmokeErrorMessage = "Unknown smoke failure.";

export function readSmokeErrorMessage(error) {
  return redactSmokeSecrets(readSmokeErrorMessageValue(error));
}

export function readSmokeFailureDetails(error, details = {}) {
  return {
    ...readSmokeErrorDetails(error),
    ...readPlainRecord(details),
  };
}

function readSmokeErrorMessageValue(error) {
  if (error instanceof Error) {
    return readNonEmptyString(error.message);
  }

  if (isPlainRecord(error) && typeof error.message === "string") {
    return readNonEmptyString(error.message);
  }

  if (typeof error === "string") {
    return readNonEmptyString(error);
  }

  return error === null || error === undefined
    ? fallbackSmokeErrorMessage
    : readNonEmptyString(String(error));
}

function readSmokeErrorDetails(error) {
  if (!error || typeof error !== "object") {
    return {};
  }

  return readPlainRecord(error.smokeDetails);
}

function readNonEmptyString(value) {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : fallbackSmokeErrorMessage;
}

function readPlainRecord(value) {
  return isPlainRecord(value) ? value : {};
}

function isPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}
