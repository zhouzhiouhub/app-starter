import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readmePath = new URL("../../README.md", import.meta.url);
const schemaPath = new URL(
  "../../services/api/prisma/schema.prisma",
  import.meta.url,
);

test("README Prisma table list matches schema models", () => {
  const readme = readFileSync(readmePath, "utf8");
  const schema = readFileSync(schemaPath, "utf8");
  const models = readPrismaModelNames(schema);
  const documentedTables = readReadmePrismaTableNames(readme);

  assert.deepEqual(documentedTables, models);
});

function readPrismaModelNames(schema) {
  return [...schema.matchAll(/^model\s+([A-Za-z][A-Za-z0-9_]*)\s+\{/gm)].map(
    (match) => match[1],
  );
}

function readReadmePrismaTableNames(readme) {
  const match = readme.match(
    /psql\.exe"[\s\S]*?-c "\\dt"[\s\S]*?```text\s*([\s\S]*?)```/,
  );

  assert.ok(match, "README should document the current Prisma table list.");

  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
