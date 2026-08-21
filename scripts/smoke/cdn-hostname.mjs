const placeholderHostSuffixes = [
  ".example",
  ".example.com",
  ".example.net",
  ".example.org",
  ".invalid",
  ".test",
];

export function isLocalHostname(hostname) {
  const normalized = normalizeHostname(hostname);

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".local.invalid") ||
    normalized === "host.docker.internal" ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    isPrivateOrLocalIpv4(normalized) ||
    isPrivateOrLocalIpv6(normalized)
  );
}

export function isPlaceholderHostname(hostname) {
  const normalized = normalizeHostname(hostname);

  return (
    isDocumentationIpv6(normalized) ||
    placeholderHostSuffixes.some(
      (suffix) =>
        normalized === suffix.slice(1) || normalized.endsWith(suffix),
    )
  );
}

function normalizeHostname(hostname) {
  return hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
}

function isPrivateOrLocalIpv4(hostname) {
  const parts = hostname.split(".").map((part) => Number(part));

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [first, second] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isPrivateOrLocalIpv6(hostname) {
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

  const firstHextet = Number.parseInt(hostname.split(":")[0], 16);

  return (
    Number.isInteger(firstHextet) &&
    ((firstHextet >= 0xfc00 && firstHextet <= 0xfdff) ||
      (firstHextet >= 0xfe80 && firstHextet <= 0xfebf))
  );
}

function readMappedIpv4(hostname) {
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

  const [first, second] = parts;

  return [
    first >> 8,
    first & 255,
    second >> 8,
    second & 255,
  ].join(".");
}

function isDocumentationIpv6(hostname) {
  return (
    hostname === "2001:db8" ||
    hostname.startsWith("2001:db8:") ||
    hostname.startsWith("2001:db8::")
  );
}
