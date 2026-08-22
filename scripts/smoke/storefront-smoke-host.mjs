import { readSiteDomainHeader } from "../../packages/schema/dist/index.js";

export function readSmokeStorefrontHost(input) {
  return readSiteDomainHeader(input?.storefrontHost);
}

export function readSmokeStorefrontOrigin(input) {
  const host = readSmokeStorefrontHost(input);

  if (host) {
    return `${readSmokeStorefrontHostProtocol(host)}://${host}`;
  }

  return input.webUrl;
}

function readSmokeStorefrontHostProtocol(host) {
  return host === "localhost" || host.startsWith("localhost:")
    ? "http"
    : "https";
}
