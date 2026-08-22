export function readSafeMediaAssetUrl(value: string): string | null {
  const url = value.trim();

  if (!url) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!isHttpProtocol(parsed.protocol) || parsed.username || parsed.password) {
    return null;
  }

  return parsed.href;
}

function isHttpProtocol(protocol: string): boolean {
  return protocol === "http:" || protocol === "https:";
}
