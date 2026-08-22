export function createMediaActor(overrides = {}) {
  return {
    email: "admin@example.com",
    id: "user-1",
    name: "Admin",
    scopes: ["media:write"],
    tenantId: "tenant-1",
    ...overrides,
  };
}

export function createMediaAsset(input = {}) {
  const filename = input.filename ?? "hero.png";
  const type = input.type ?? "image";

  return {
    createdAt: new Date("2026-08-18T00:00:00.000Z"),
    filename,
    id: input.id ?? "asset-1",
    metadata: input.metadata ?? {},
    mimeType: input.mimeType ?? readMimeType(type),
    r2Key: input.r2Key ?? `tenant-1/${filename}`,
    size: input.size ?? 2048n,
    tenantId: input.tenantId ?? "tenant-1",
    type,
    url: input.url ?? `https://cdn.example.com/${filename}`,
  };
}

function readMimeType(type) {
  if (type === "image") {
    return "image/png";
  }

  if (type === "pdf") {
    return "application/pdf";
  }

  return "application/octet-stream";
}
