import { createHash, createHmac } from "node:crypto";
import {
  encodeMediaObjectKey,
  encodeMediaPathSegment,
} from "./media.object-key.js";

export function createR2PresignedPutUrl(input: {
  accessKeyId: string;
  accountId: string;
  bucket: string;
  mimeType: string;
  now: Date;
  r2Key: string;
  region: string;
  secretAccessKey: string;
  ttlSeconds: number;
}) {
  const host = `${input.accountId}.r2.cloudflarestorage.com`;
  const credentialDate = toCredentialDate(input.now);
  const timestamp = toAmzDate(input.now);
  const credentialScope = `${credentialDate}/${input.region}/s3/aws4_request`;
  const canonicalUri = `/${encodeMediaPathSegment(
    input.bucket,
  )}/${encodeMediaObjectKey(input.r2Key)}`;
  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${input.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": timestamp,
    "X-Amz-Expires": String(input.ttlSeconds),
    "X-Amz-SignedHeaders": "content-type;host",
  });
  const canonicalQuery = canonicalizeQuery(query);
  const canonicalHeaders = `content-type:${input.mimeType}\nhost:${host}\n`;
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    "content-type;host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    timestamp,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signature = hmacHex(
    getSigningKey(input.secretAccessKey, credentialDate, input.region, "s3"),
    stringToSign,
  );

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

function canonicalizeQuery(query: URLSearchParams): string {
  return [...query.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([key, value]) =>
        `${encodeMediaPathSegment(key)}=${encodeMediaPathSegment(value)}`,
    )
    .join("&");
}

function getSigningKey(
  secretAccessKey: string,
  credentialDate: string,
  region: string,
  service: string,
) {
  const dateKey = hmacBuffer(`AWS4${secretAccessKey}`, credentialDate);
  const regionKey = hmacBuffer(dateKey, region);
  const serviceKey = hmacBuffer(regionKey, service);
  return hmacBuffer(serviceKey, "aws4_request");
}

function hmacBuffer(key: string | Buffer, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function hmacHex(key: Buffer, value: string): string {
  return createHmac("sha256", key).update(value).digest("hex");
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function toCredentialDate(date: Date): string {
  return toAmzDate(date).slice(0, 8);
}
