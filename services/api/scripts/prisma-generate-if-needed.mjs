#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const schemaPath = path.join(apiRoot, "prisma", "schema.prisma");
const requiredClientFiles = ["index.js", "index.d.ts", "schema.prisma"];

export async function runPrismaGenerateIfNeeded(
  args = process.argv.slice(2),
  input = {},
) {
  const writeLine = input.stdout ?? console.log;
  const force = args.includes("--force");

  if (!force) {
    const state = await readPrismaClientState(input);

    if (state.upToDate) {
      writeLine("Prisma client is up to date; skipping prisma generate.");
      return 0;
    }

    writeLine(`Prisma client ${state.reason}; running prisma generate.`);
  }

  return input.generate
    ? input.generate()
    : runPrismaGenerateCommand(input);
}

export async function readPrismaClientState(input = {}) {
  const sourceSchemaPath = input.schemaPath ?? schemaPath;
  const generatedClientDir =
    input.generatedClientDir ?? resolveGeneratedPrismaClientDir(input.apiRoot);

  if (!generatedClientDir) {
    return { reason: "generated output is missing", upToDate: false };
  }

  const sourceSchema = await readOptionalText(sourceSchemaPath);
  if (sourceSchema === null) {
    return { reason: "source schema is missing", upToDate: false };
  }

  const requiredFiles = input.requiredClientFiles ?? requiredClientFiles;
  const missingFile = await findMissingFile(generatedClientDir, requiredFiles);
  if (missingFile) {
    return {
      reason: `${missingFile} is missing`,
      upToDate: false,
    };
  }

  const generatedSchema = await readOptionalText(
    path.join(generatedClientDir, "schema.prisma"),
  );
  if (generatedSchema === null) {
    return { reason: "generated schema is missing", upToDate: false };
  }

  if (hashText(sourceSchema) !== hashText(generatedSchema)) {
    return {
      reason: "schema changed since the last generated client",
      upToDate: false,
    };
  }

  return {
    generatedClientDir,
    reason: "schema matches generated client",
    upToDate: true,
  };
}

export function resolveGeneratedPrismaClientDir(root = apiRoot) {
  try {
    const requireFromApi = createRequire(path.join(root, "package.json"));
    const clientDefaultPath = requireFromApi.resolve(
      "@prisma/client/default.js",
    );
    return path.dirname(
      requireFromApi.resolve(".prisma/client/default", {
        paths: [path.dirname(clientDefaultPath)],
      }),
    );
  } catch {
    return null;
  }
}

function runPrismaGenerateCommand(input = {}) {
  const root = input.apiRoot ?? apiRoot;
  const command =
    input.prismaCommand ??
    path.join(
      root,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "prisma.CMD" : "prisma",
    );
  const args = input.prismaArgs ?? ["generate", "--schema", "prisma/schema.prisma"];
  const stderr = input.stderr ?? console.error;

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: root,
      shell: false,
      stdio: "inherit",
    });

    child.once("error", (error) => {
      stderr(`Prisma generate failed to start: ${error.message}`);
      resolve(1);
    });
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

async function findMissingFile(root, fileNames) {
  for (const fileName of fileNames) {
    const exists = await canRead(path.join(root, fileName));
    if (!exists) {
      return fileName;
    }
  }

  return null;
}

async function canRead(filePath) {
  try {
    await access(filePath, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function readOptionalText(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function hashText(value) {
  return createHash("sha256").update(value).digest("hex");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await runPrismaGenerateIfNeeded();
}
