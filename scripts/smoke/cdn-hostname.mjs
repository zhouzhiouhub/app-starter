import { readProductionHostnameIssue } from "./production-hostname-validation.mjs";

export function isLocalHostname(hostname) {
  return readProductionHostnameIssue(hostname) === "local-host";
}

export function isPlaceholderHostname(hostname) {
  return readProductionHostnameIssue(hostname) === "placeholder-host";
}
