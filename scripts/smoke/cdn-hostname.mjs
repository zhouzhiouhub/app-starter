import { readProductionHostnameIssue } from "../../packages/schema/dist/index.js";

export function isLocalHostname(hostname) {
  return readProductionHostnameIssue(hostname) === "local-host";
}

export function isPlaceholderHostname(hostname) {
  return readProductionHostnameIssue(hostname) === "placeholder-host";
}
