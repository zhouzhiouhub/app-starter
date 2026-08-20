import { resolveWebOrigin } from "./runtime-url";

export function getWebOrigin(): string {
  return resolveWebOrigin({
    publicWebUrl: process.env.NEXT_PUBLIC_WEB_URL,
    webUrl: process.env.WEB_URL,
  });
}
