import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isLocalHostname,
  isPlaceholderHostname,
} from "./cdn-hostname.mjs";

const defaultMigrationsDirectoryLabel = "services/api/prisma/migrations";
const defaultMigrationsDirectory = fileURLToPath(
  new URL("../../services/api/prisma/migrations", import.meta.url),
);

export function createDatabaseDiagnostics(env = process.env, options = {}) {
  const value = readEnv(env, "DATABASE_URL");
  const configured = Boolean(value);
  const hasControlCharacters = value ? hasControlCharacter(value) : false;
  const hasSurroundingWhitespace = value ? value.trim() !== value : false;
  const url =
    value && !hasControlCharacters && !hasSurroundingWhitespace
      ? readDatabaseUrl(value)
      : null;
  const urlIssue = readDatabaseUrlIssue({
    configured,
    hasControlCharacters,
    hasSurroundingWhitespace,
    url,
  });
  const migrations = createPrismaMigrationDiagnostics(options);

  return {
    configured,
    host: url?.hostname ?? null,
    migrations,
    productionReady: configured && urlIssue === null && migrations.productionReady,
    urlIssue,
    urlSafe: configured && urlIssue === null,
    variable: "DATABASE_URL",
  };
}

export function createPrismaMigrationDiagnostics(options = {}) {
  const directory =
    typeof options.prismaMigrationsDir === "string" &&
    options.prismaMigrationsDir.trim().length > 0
      ? options.prismaMigrationsDir
      : defaultMigrationsDirectory;
  const label =
    typeof options.prismaMigrationsLabel === "string" &&
    options.prismaMigrationsLabel.trim().length > 0
      ? options.prismaMigrationsLabel
      : defaultMigrationsDirectoryLabel;
  const state = readMigrationsDirectoryState(directory);
  const issue = readMigrationIssue(state);

  return {
    directory: label,
    hasMigrationLock: state.hasMigrationLock,
    migrationCount: state.migrationCount,
    productionReady: issue === null,
    issue,
  };
}

function readDatabaseUrlIssue(input) {
  if (!input.configured) {
    return "missing-url";
  }

  if (input.hasControlCharacters) {
    return "control-character";
  }

  if (input.hasSurroundingWhitespace) {
    return "surrounding-whitespace";
  }

  if (!input.url) {
    return "invalid-url";
  }

  if (!["postgres:", "postgresql:"].includes(input.url.protocol)) {
    return "unsupported-protocol";
  }

  if (!input.url.hostname) {
    return "missing-host";
  }

  if (isLocalHostname(input.url.hostname)) {
    return "local-host";
  }

  if (isPlaceholderHostname(input.url.hostname)) {
    return "placeholder-host";
  }

  return null;
}

function readDatabaseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function readEnv(env, name) {
  const value = env[name];
  return typeof value === "string" && value.trim() ? value : null;
}

function hasControlCharacter(value) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

function readMigrationsDirectoryState(directory) {
  try {
    const entries = readdirSync(directory, { withFileTypes: true });

    return {
      exists: true,
      hasMigrationLock: entries.some(
        (entry) => entry.isFile() && entry.name === "migration_lock.toml",
      ),
      migrationCount: entries.filter((entry) =>
        isPrismaMigrationDirectory(directory, entry),
      ).length,
      readable: true,
    };
  } catch (error) {
    return {
      exists: error?.code !== "ENOENT",
      hasMigrationLock: false,
      migrationCount: 0,
      readable: false,
    };
  }
}

function isPrismaMigrationDirectory(directory, entry) {
  if (!entry.isDirectory()) {
    return false;
  }

  try {
    return readdirSync(join(directory, entry.name), {
      withFileTypes: true,
    }).some((child) => child.isFile() && child.name === "migration.sql");
  } catch {
    return false;
  }
}

function readMigrationIssue(state) {
  if (!state.exists) {
    return "missing-directory";
  }

  if (!state.readable) {
    return "unreadable-directory";
  }

  if (state.migrationCount < 1) {
    return "no-migrations";
  }

  if (!state.hasMigrationLock) {
    return "missing-migration-lock";
  }

  return null;
}
