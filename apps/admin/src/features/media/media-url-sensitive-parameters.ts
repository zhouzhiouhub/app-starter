import { isSensitiveUrlParameterKey } from "@app-starter/schema";

export function hasSensitiveMediaUrlQueryParameters(url: URL): boolean {
  return Array.from(url.searchParams.keys()).some(isSensitiveMediaUrlQueryKey);
}

function isSensitiveMediaUrlQueryKey(key: string): boolean {
  return isSensitiveUrlParameterKey(key);
}
