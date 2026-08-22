import { AuthRequiredError } from "./api";

export function redirectWhenAuthRequired(error: unknown): boolean {
  if (!(error instanceof AuthRequiredError)) {
    return false;
  }

  globalThis.location.assign("/login");
  return true;
}
