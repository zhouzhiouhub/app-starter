export type StorefrontRevalidationResponse = {
  body?: {
    cancel?: () => Promise<unknown> | unknown;
  } | null;
  ok: boolean;
  status: number;
};

export async function cancelStorefrontRevalidationResponseBody(
  response: StorefrontRevalidationResponse,
) {
  try {
    await response.body?.cancel?.();
  } catch {
    return;
  }
}
