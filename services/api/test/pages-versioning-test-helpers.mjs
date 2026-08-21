export function createRollbackPrisma(options) {
  const site = options.site ?? {
    id: "site-1",
    tenantId: "tenant-1",
  };
  const target = options.target;

  return {
    $transaction: async (fn) =>
      fn({
        auditLog: {
          create: async (input) => {
            options.onAudit?.(input);
            return {};
          },
        },
        page: {
          findFirst: async () => ({
            id: "page-1",
            siteId: "site-1",
            slug: "home",
            versions: [
              { id: "version-latest", status: "published", version: 3 },
            ],
          }),
          update: async (input) => {
            options.onUpdatePage?.(input);
            return {};
          },
        },
        pageVersion: {
          create: async (input) => options.onCreateVersion(input),
          findFirst: async () => target,
        },
      }),
    site: {
      findFirst: async () => site,
    },
  };
}
