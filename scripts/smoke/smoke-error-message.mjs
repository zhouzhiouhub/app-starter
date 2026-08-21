import { redactSmokeSecrets } from "./smoke-secrets.mjs";

export function readErrorMessage(error) {
  return redactSmokeSecrets(error instanceof Error ? error.message : error);
}
