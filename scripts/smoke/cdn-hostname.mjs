const placeholderHostSuffixes = [
  ".example",
  ".example.com",
  ".example.net",
  ".example.org",
  ".invalid",
  ".test",
];

export function isLocalHostname(hostname) {
  const normalized = hostname.toLowerCase();

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".local.invalid") ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    isPrivateOrLocalIpv4(normalized)
  );
}

export function isPlaceholderHostname(hostname) {
  const normalized = hostname.toLowerCase();

  return placeholderHostSuffixes.some(
    (suffix) => normalized === suffix.slice(1) || normalized.endsWith(suffix),
  );
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
