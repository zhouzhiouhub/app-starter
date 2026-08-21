export function isProductionHttpUrl(url: URL): boolean {
  return url.protocol === "https:" && !isUnsafeProductionHostname(url.hostname);
}

export function isUnsafeProductionHostname(hostname: string): boolean {
  return isLocalOrPrivateHostname(hostname) || isPlaceholderHostname(hostname);
}

function isLocalOrPrivateHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);

  return (
    !normalized ||
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".local.invalid") ||
    normalized === "host.docker.internal" ||
    isPrivateOrLocalIpv4(normalized) ||
    isPrivateOrLocalIpv6(normalized)
  );
}

function isPrivateOrLocalIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part));

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const first = parts[0];
  const second = parts[1];
  const third = parts[2];

  if (first === undefined || second === undefined || third === undefined) {
    return false;
  }

  return (
    first === 0 ||
    first === 10 ||
    (first === 100 && second >= 64 && second <= 127) ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 88 && third === 99) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function isPrivateOrLocalIpv6(hostname: string): boolean {
  if (!hostname.includes(":")) {
    return false;
  }

  if (
    hostname === "::" ||
    hostname === "::1" ||
    hostname === "0:0:0:0:0:0:0:0" ||
    hostname === "0:0:0:0:0:0:0:1"
  ) {
    return true;
  }

  const mappedIpv4 = readMappedIpv4(hostname);
  if (mappedIpv4) {
    return isPrivateOrLocalIpv4(mappedIpv4);
  }

  const firstHextet = Number.parseInt(hostname.split(":")[0] ?? "", 16);

  return (
    Number.isInteger(firstHextet) &&
    ((firstHextet >= 0xfc00 && firstHextet <= 0xfdff) ||
      (firstHextet >= 0xfe80 && firstHextet <= 0xfebf))
  );
}

function readMappedIpv4(hostname: string): string | null {
  const prefix = "::ffff:";

  if (!hostname.startsWith(prefix)) {
    return null;
  }

  const tail = hostname.slice(prefix.length);

  if (tail.includes(".")) {
    return tail;
  }

  const parts = tail.split(":").map((part) => Number.parseInt(part, 16));

  if (
    parts.length !== 2 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 65535)
  ) {
    return null;
  }

  const first = parts[0];
  const second = parts[1];

  if (first === undefined || second === undefined) {
    return null;
  }

  return [first >> 8, first & 255, second >> 8, second & 255].join(".");
}

function isPlaceholderHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);

  return (
    isDocumentationIpv4(normalized) ||
    isMappedDocumentationIpv4(normalized) ||
    normalized === "example" ||
    normalized.endsWith(".example") ||
    normalized === "example.com" ||
    normalized.endsWith(".example.com") ||
    normalized === "example.org" ||
    normalized.endsWith(".example.org") ||
    normalized === "example.net" ||
    normalized.endsWith(".example.net") ||
    normalized.endsWith(".invalid") ||
    normalized.endsWith(".test") ||
    normalized === "2001:db8" ||
    normalized.startsWith("2001:db8:") ||
    normalized.startsWith("2001:db8::")
  );
}

function isDocumentationIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part));

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const first = parts[0];
  const second = parts[1];
  const third = parts[2];

  return (
    (first === 192 && second === 0 && third === 2) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113)
  );
}

function isMappedDocumentationIpv4(hostname: string): boolean {
  const mappedIpv4 = readMappedIpv4(hostname);
  return mappedIpv4 ? isDocumentationIpv4(mappedIpv4) : false;
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
}
