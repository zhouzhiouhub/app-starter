import assert from "node:assert/strict";
import test from "node:test";
import {
  getPublicDefaultSite,
  getSiteForTenant,
} from "../dist/modules/pages/pages.site.js";

const site = {
  createdAt: new Date("2026-08-19T00:00:00.000Z"),
  domain: "localhost",
  id: "site-1",
  name: "Default Site",
  tenantId: "tenant-1",
};

test("page site lookup falls back after the default domain changes", async () => {
  const prisma = {
    site: {
      findFirst: async (query) => {
        if (query.where?.domain === "localhost") {
          return null;
        }

        assert.equal(query.where.tenantId, "tenant-1");
        assert.deepEqual(query.orderBy, { createdAt: "asc" });
        return { ...site, domain: "store.example.com" };
      },
    },
  };

  assert.equal(
    (await getSiteForTenant(prisma, "tenant-1")).domain,
    "store.example.com",
  );
});

test("public site lookup falls back to the first site", async () => {
  const prisma = {
    site: {
      findFirst: async (query) => {
        if (query.where?.domain === "localhost") {
          return null;
        }

        assert.deepEqual(query.orderBy, { createdAt: "asc" });
        return { ...site, domain: "store.example.com" };
      },
      findUnique: async () => null,
    },
  };

  assert.equal(
    (await getPublicDefaultSite(prisma)).domain,
    "store.example.com",
  );
});
