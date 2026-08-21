import { resolveWebOrigin } from "./runtime-url";

export function getWebOrigin(): string {
  return resolveWebOrigin({
    deploymentEnv: process.env.VERCEL_ENV ?? process.env.APP_ENV,
    publicWebUrl: process.env.NEXT_PUBLIC_WEB_URL,
    webUrl: process.env.WEB_URL,
  });
}
