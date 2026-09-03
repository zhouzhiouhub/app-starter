export const publicApiFetchTimeoutMs = 5000;

export function createPublicApiAbortSignal(): AbortSignal {
  return AbortSignal.timeout(publicApiFetchTimeoutMs);
}
