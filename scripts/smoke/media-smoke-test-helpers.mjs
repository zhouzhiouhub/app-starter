const r2SignedQuery = [
  "X-Amz-Algorithm=AWS4-HMAC-SHA256",
  "X-Amz-Credential=access%2F20260819%2Fauto%2Fs3%2Faws4_request",
  "X-Amz-Date=20260819T000000Z",
  "X-Amz-Expires=900",
  "X-Amz-SignedHeaders=content-type%3Bhost",
  "X-Amz-Signature=abc123",
].join("&");

export function r2UploadUrl(
  path,
  origin = "https://account.r2.cloudflarestorage.com",
) {
  return `${origin}${path}?${r2SignedQuery}`;
}
