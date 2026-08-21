import { createPageVersionResult } from "./pages-test-helpers.mjs";

export function createPublishPrisma(calls, options = {}) {
  const site = options.site ?? {
    id: "site-1",
    tenantId: "tenant-1",
  };

  return {
    $transaction: async (fn) =>
      fn({
        auditLog: {
          create: async (input) => {
            if (options.auditCreate) {
              return options.auditCreate(input);
            }

            calls.audit = input.data;
            return {};
          },
        },
        page: {
          findFirst: async () =>
            options.page ?? {
              id: "page-1",
              siteId: site.id,
              slug: "launch",
              versions: [
                { id: "version-1", status: "published", version: 1 },
              ],
            },
          update: async (input) => {
            calls.pageUpdate = input.data;
            return {};
          },
        },
        pageVersion: {
          create: async (input) => {
            calls.versionCreate = input.data;
            return createPageVersionResult(input, options.versionResult);
          },
        },
        mediaAsset: {
          findMany: options.mediaFindMany ?? (async () => []),
        },
      }),
    site: {
      findFirst: async () => site,
    },
  };
}
