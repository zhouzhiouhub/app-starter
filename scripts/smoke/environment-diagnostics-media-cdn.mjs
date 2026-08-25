import {
  isLocalHostname,
  isPlaceholderHostname,
} from "./cdn-hostname.mjs";

const mediaBaseUrlFilePathPattern =
  /\.(?:avif|bmp|css|gif|html?|ico|jpe?g|js|json|m4v|mov|mp4|pdf|png|svg|txt|webm|webp|xml|zip)$/i;

export function readCdnDiagnostics(value) {
  let url;

  if (hasControlCharacter(value)) {
    return readUnsafeCdnUrl(null, null, "control-character");
  }

  try {
    url = new URL(value);
  } catch {
    return {
      host: null,
      issue: "invalid-url",
      localHost: false,
      productionReady: false,
      safe: false,
    };
  }

  const host = url.hostname || null;

  if (url.protocol !== "https:") {
    return readUnsafeCdnUrl(host, url.hostname, "unsupported-protocol");
  }

  if (url.username || url.password) {
    return readUnsafeCdnUrl(host, url.hostname, "embedded-credentials");
  }

  if (url.search || url.hash) {
    return readUnsafeCdnUrl(host, url.hostname, "unsupported-url-parts");
  }

  if (hasDecodedPathControlCharacter(url.pathname)) {
    return readUnsafeCdnUrl(host, url.hostname, "control-character");
  }

  if (hasFileLikeBaseUrlPath(url.pathname)) {
    return readUnsafeCdnUrl(host, url.hostname, "file-path");
  }

  const localHost = isLocalHostname(url.hostname);
  const placeholderHost = isPlaceholderHostname(url.hostname);

  return {
    host,
    issue: localHost
      ? "local-host"
      : placeholderHost
        ? "placeholder-host"
        : null,
    localHost,
    productionReady: !localHost && !placeholderHost,
    safe: !localHost && !placeholderHost,
  };
}

function readUnsafeCdnUrl(host, hostname, issue) {
  return {
    host,
    issue,
    localHost: Boolean(hostname && isLocalHostname(hostname)),
    productionReady: false,
    safe: false,
  };
}

function hasFileLikeBaseUrlPath(pathname) {
  const trimmed = pathname.replace(/\/+$/g, "");

  if (!trimmed || trimmed === "/") {
    return false;
  }

  const lastSegment = trimmed.split("/").pop() ?? "";
  const decodedSegment = decodePathSegment(lastSegment);

  return mediaBaseUrlFilePathPattern.test(decodedSegment);
}

function decodePathSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function hasDecodedPathControlCharacter(pathname) {
  try {
    return hasControlCharacter(decodeURIComponent(pathname));
  } catch {
    return false;
  }
}

function hasControlCharacter(value) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
