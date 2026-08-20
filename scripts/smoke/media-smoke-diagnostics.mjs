import {
  isLocalHostname,
  isPlaceholderHostname,
} from "./cdn-hostname.mjs";

const maxR2PresignedUrlExpiresSeconds = 15 * 60;

export function isR2UploadUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.hostname.endsWith(".r2.cloudflarestorage.com") &&
      !url.hash &&
      url.searchParams.get("X-Amz-Algorithm") === "AWS4-HMAC-SHA256" &&
      Boolean(url.searchParams.get("X-Amz-Credential")) &&
      Boolean(url.searchParams.get("X-Amz-Date")) &&
      hasSafeExpiresQuery(url.searchParams.get("X-Amz-Expires")) &&
      url.searchParams.get("X-Amz-SignedHeaders") === "content-type;host" &&
      Boolean(url.searchParams.get("X-Amz-Signature"))
    );
  } catch {
    return false;
  }
}

export function isR2UploadUrlForKey(value, r2Key) {
  try {
    const url = new URL(value);
    return isR2UploadUrl(value) && decodedPathEndsWithKey(url, r2Key);
  } catch {
    return false;
  }
}

export function isCdnUrlForR2Key(value, r2Key) {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      decodedPathEndsWithKey(url, r2Key)
    );
  } catch {
    return false;
  }
}

export function isProductionCdnUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      !isLocalHostname(url.hostname) &&
      !isPlaceholderHostname(url.hostname)
    );
  } catch {
    return false;
  }
}

export function isMediaReference(value) {
  return typeof value === "string" && /^media:\/\/[a-zA-Z0-9_-]+$/.test(value);
}

export function isMediaListResponseContainingAsset(body, asset) {
  const diagnostic = readMediaListFilterDiagnostic(body, asset);

  return (
    diagnostic.idPresent &&
    diagnostic.filenameMatches &&
    diagnostic.referenceMatches &&
    diagnostic.status === "active" &&
    diagnostic.type === "image"
  );
}

export function readMediaListFilterDiagnostic(body, asset) {
  const items = Array.isArray(body?.data) ? body.data : [];
  const match = items.find((item) => item?.id === asset?.id);

  return {
    expectedAssetId: asset?.id ?? null,
    filenameMatches: match?.filename === asset?.filename,
    idPresent: Boolean(match),
    itemCount: items.length,
    referenceMatches: match?.reference === asset?.reference,
    status: typeof match?.status === "string" ? match.status : null,
    type: typeof match?.type === "string" ? match.type : null,
  };
}

export function formatMediaListFilterDiagnostic(diagnostic) {
  return `items: ${diagnostic.itemCount}, expected asset: ${diagnostic.expectedAssetId ?? "unknown"}, id present: ${diagnostic.idPresent}, filename matches: ${diagnostic.filenameMatches}, reference matches: ${diagnostic.referenceMatches}, status: ${diagnostic.status ?? "missing"}, type: ${diagnostic.type ?? "missing"}`;
}

export function createMediaSmokeDetails(target, asset, requireR2Upload) {
  return {
    assetId: asset.id,
    assetSize: asset.size ?? null,
    assetStatus: asset.status ?? null,
    assetType: asset.type ?? null,
    cdnHost: readUrlHost(asset.url),
    cdnUrlMatchesR2Key: isCdnUrlForR2Key(asset.url, target.r2Key),
    confirmPath: target.confirmPath,
    isR2UploadUrl: isR2UploadUrl(target.uploadUrl),
    presignedUrlHost: readUrlHost(target.uploadUrl),
    productionCdn: isProductionCdnUrl(asset.url),
    r2Key: asset.r2Key,
    reference: asset.reference,
    uploadContentType: target.headers?.["Content-Type"] ?? null,
    uploadExpiresAt: target.expiresAt,
    uploadMaxSize: target.maxSize,
    uploadMethod: target.method,
    uploadUrlMatchesR2Key: isR2UploadUrlForKey(target.uploadUrl, target.r2Key),
    uploadedObject: Boolean(requireR2Upload),
  };
}

function decodedPathEndsWithKey(url, r2Key) {
  try {
    return decodeURIComponent(url.pathname).endsWith(`/${r2Key}`);
  } catch {
    return false;
  }
}

function readUrlHost(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function hasSafeExpiresQuery(value) {
  const seconds = Number(value);

  return Boolean(
    value &&
      /^\d+$/.test(value) &&
      seconds > 0 &&
      seconds <= maxR2PresignedUrlExpiresSeconds,
  );
}
