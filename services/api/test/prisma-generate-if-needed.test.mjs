import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  readPrismaClientState,
  runPrismaGenerateIfNeeded,
} from "../scripts/prisma-generate-if-needed.mjs";

test("Prisma generate skips when generated schema matches", async () => {
  const fixture = await createFixture({ generatedSchema: "model User { id String @id }\n" });
  const stdout = [];
  let generated = false;

  try {
    const exitCode = await runPrismaGenerateIfNeeded([], {
      ...fixture,
      generate: () => {
        generated = true;
        return 0;
      },
      stdout: (line) => stdout.push(line),
    });

    assert.equal(exitCode, 0);
    assert.equal(generated, false);
    assert.deepEqual(stdout, [
      "Prisma client is up to date; skipping prisma generate.",
    ]);
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});

test("Prisma generate runs when generated schema is stale", async () => {
  const fixture = await createFixture({ generatedSchema: "model User { id Int @id }\n" });
  const stdout = [];
  let generated = false;

  try {
    const exitCode = await runPrismaGenerateIfNeeded([], {
      ...fixture,
      generate: () => {
        generated = true;
        return 0;
      },
      stdout: (line) => stdout.push(line),
    });

    assert.equal(exitCode, 0);
    assert.equal(generated, true);
    assert.deepEqual(stdout, [
      "Prisma client schema changed since the last generated client; running prisma generate.",
    ]);
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});

test("Prisma generate runs when forced", async () => {
  const fixture = await createFixture({ generatedSchema: "model User { id String @id }\n" });
  const stdout = [];
  let generated = false;

  try {
    const exitCode = await runPrismaGenerateIfNeeded(["--force"], {
      ...fixture,
      generate: () => {
        generated = true;
        return 0;
      },
      stdout: (line) => stdout.push(line),
    });

    assert.equal(exitCode, 0);
    assert.equal(generated, true);
    assert.deepEqual(stdout, []);
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});

test("Prisma client state reports missing generated files", async () => {
  const fixture = await createFixture({
    generatedSchema: "model User { id String @id }\n",
    writeIndex: false,
  });

  try {
    const state = await readPrismaClientState(fixture);

    assert.equal(state.upToDate, false);
    assert.equal(state.reason, "index.js is missing");
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});

async function createFixture(input = {}) {
  const root = path.join(
    tmpdir(),
    `prisma-generate-if-needed-${process.pid}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`,
  );
  const schemaPath = path.join(root, "prisma", "schema.prisma");
  const generatedClientDir = path.join(root, "generated", "client");
  const sourceSchema = "model User { id String @id }\n";

  await mkdir(path.dirname(schemaPath), { recursive: true });
  await mkdir(generatedClientDir, { recursive: true });
  await writeFile(schemaPath, sourceSchema, "utf8");
  await writeFile(
    path.join(generatedClientDir, "schema.prisma"),
    input.generatedSchema ?? sourceSchema,
    "utf8",
  );
  await writeFile(path.join(generatedClientDir, "index.d.ts"), "", "utf8");
  if (input.writeIndex !== false) {
    await writeFile(path.join(generatedClientDir, "index.js"), "", "utf8");
  }

  return { generatedClientDir, root, schemaPath };
}
