const defaultMigrationsDirectory = "services/api/prisma/migrations";

export function readMigrationAction(blocker) {
  const directory = blocker.directory ?? defaultMigrationsDirectory;

  if (blocker.issue === "missing-directory") {
    return `Create ${directory} with committed Prisma migration folders, then run prisma migrate deploy in production.`;
  }

  if (blocker.issue === "unreadable-directory") {
    return `Fix read access to ${directory} so smoke can verify committed Prisma migrations before deploy.`;
  }

  if (blocker.issue === "no-migrations") {
    return `Add at least one committed Prisma migration.sql under ${directory}, then deploy with prisma migrate deploy.`;
  }

  if (blocker.issue === "missing-migration-lock") {
    return `Commit ${directory}/migration_lock.toml alongside migration folders before production smoke.`;
  }

  return `Verify ${directory} contains committed Prisma migrations and run prisma migrate deploy in production.`;
}
