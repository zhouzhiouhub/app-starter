import assert from "node:assert/strict";
import test from "node:test";
import { formatAuditMetadata } from "../src/features/audit/audit-metadata-format.ts";

test("audit metadata formatter redacts legacy secrets before display", () => {
  const formatted = formatAuditMetadata({
    authorization: "Bearer header.payload.signature",
    databaseUrl: "postgresql://db-user:db-secret@db.example.com/app",
    note: "Preview URL /api/v1/public/preview/payload.signature",
    password: "ChangeMe123!",
    slug: "home",
  });

  assert.equal(formatted.includes("header.payload.signature"), false);
  assert.equal(formatted.includes("db-user"), false);
  assert.equal(formatted.includes("db-secret"), false);
  assert.equal(formatted.includes("ChangeMe123"), false);
  assert.match(formatted, /"authorization": "\[redacted\]"/);
  assert.match(formatted, /"databaseUrl": "\[redacted\]"/);
  assert.match(formatted, /"password": "\[redacted\]"/);
  assert.match(
    formatted,
    /"note": "Preview URL \/api\/v1\/public\/preview\/\[redacted\]"/,
  );
  assert.match(formatted, /"slug": "home"/);
});

test("audit metadata formatter caps rendered metadata text", () => {
  const formatted = formatAuditMetadata({
    description: "a".repeat(5_000),
  });

  assert.equal(formatted.length, 4_021);
  assert.equal(formatted.endsWith("\n[metadata truncated]"), true);
});

test("audit metadata formatter falls back for circular objects", () => {
  const metadata = {};
  metadata.self = metadata;

  assert.equal(formatAuditMetadata(metadata), "{}");
});
