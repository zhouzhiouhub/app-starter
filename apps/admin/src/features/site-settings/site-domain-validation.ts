import {
  normalizeSiteDomain,
  readSiteDomainValidationError,
} from "@app-starter/schema";

export function normalizeSiteDomainInput(value: string): string {
  return normalizeSiteDomain(value);
}

export function readSiteDomainFormError(value: unknown): string | null {
  if (typeof value !== "string") {
    return "Domain is required.";
  }

  return readSiteDomainValidationError(value);
}

export function validateSiteDomainFormValue(
  _rule: unknown,
  value: unknown,
): Promise<void> {
  const error = readSiteDomainFormError(value);
  return error ? Promise.reject(new Error(error)) : Promise.resolve();
}
