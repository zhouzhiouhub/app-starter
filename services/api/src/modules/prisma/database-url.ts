import { isUnsafeProductionHostname } from "@app-starter/schema";

export interface DatabaseRuntimeEnv {
  DATABASE_URL?: string;
  NODE_ENV?: string;
}

export class DatabaseRuntimeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseRuntimeConfigurationError";
  }
}

export function assertDatabaseRuntimeConfig(
  env: DatabaseRuntimeEnv = process.env,
): void {
  if (env.NODE_ENV !== "production") {
    return;
  }

  const value = env.DATABASE_URL?.trim();

  if (!value) {
    throw new DatabaseRuntimeConfigurationError(
      "DATABASE_URL is required in production.",
    );
  }

  const url = readDatabaseUrl(value);

  if (!url || !isPostgresProtocol(url.protocol)) {
    throw new DatabaseRuntimeConfigurationError(
      "DATABASE_URL must be a valid PostgreSQL connection URL in production.",
    );
  }

  if (isUnsafeProductionHostname(url.hostname)) {
    throw new DatabaseRuntimeConfigurationError(
      "DATABASE_URL must not use local or placeholder hosts in production.",
    );
  }
}

function readDatabaseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isPostgresProtocol(protocol: string): boolean {
  return protocol === "postgres:" || protocol === "postgresql:";
}
