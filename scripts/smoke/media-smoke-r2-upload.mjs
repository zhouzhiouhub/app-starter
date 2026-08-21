import { redactSmokeSecrets } from "./smoke-secrets.mjs";

export async function uploadSmokeImage(target, image) {
  const response = await fetch(target.uploadUrl, {
    body: image.body,
    headers: target.headers,
    method: target.method,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      redactSmokeSecrets(
        `R2 object upload failed. ${response.status}: ${text.slice(0, 160)}`,
      ),
    );
  }
}
