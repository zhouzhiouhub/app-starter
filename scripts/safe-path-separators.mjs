export function normalizePathSeparators(value) {
  return value.trim().replace(/[\\/]+/gu, "/");
}

export function normalizeDirectoryPathSeparators(value) {
  return normalizePathSeparators(value).replace(/\/+$/u, "");
}
