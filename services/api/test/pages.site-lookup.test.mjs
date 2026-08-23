import assert from "node:assert/strict";
import test from "node:test";
import {
  getPublicDefaultSite,
  getPublicSite,
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
        return { ...site, domain: "store.brand-platform.com" };
      },
    },
  };

  assert.equal(
    (await getSiteForTenant(prisma, "tenant-1")).domain,
    "store.brand-platform.com",
  );
});

test("public site lookup falls back to the first site without a host", async () => {
  const prisma = {
    site: {
      findFirst: async (query) => {
        if (query.where?.domain === "localhost") {
          return null;
        }

        assert.deepEqual(query.orderBy, { createdAt: "asc" });
        return { ...site, domain: "store.brand-platform.com" };
      },
      findUnique: async () => null,
    },
  };

  assert.equal(
    (await getPublicDefaultSite(prisma)).domain,
    "store.brand-platform.com",
  );
});

test("public site lookup uses the request host before default fallback", async () => {
  const prisma = {
    site: {
      findFirst: async () => {
        throw new Error("default fallback should not be queried.");
      },
      findUnique: async (query) => {
        assert.deepEqual(query.where, {
          domain: "store.brand-platform.com",
        });

        return {
          ...site,
          domain: "store.brand-platform.com",
          id: "site-public",
          tenantId: "tenant-public",
        };
      },
    },
  };

  const result = await getPublicSite(prisma, "Store.Brand-Platform.com:443");

  assert.equal(result.id, "site-public");
  assert.equal(result.tenantId, "tenant-public");
});

test("public site lookup does not leak the first site for unmatched public hosts", async () => {
  const prisma = {
    site: {
      findFirst: async () => {
        throw new Error(
          "unmatched public hosts must not use default fallback.",
        );
      },
      findUnique: async (query) => {
        assert.deepEqual(query.where, {
          domain: "missing.brand-platform.com",
        });
        return null;
      },
    },
  };

  assert.equal(await getPublicSite(prisma, "missing.brand-platform.com"), null);
});

test("public site lookup rejects explicit unsafe hosts before fallback", async () => {
  const prisma = {
    site: {
      findFirst: async () => {
        throw new Error("unsafe hosts must not use default fallback.");
      },
      findUnique: async () => {
        throw new Error("unsafe hosts must not query sites by domain.");
      },
    },
  };

  assert.equal(await getPublicSite(prisma, "store.example.com"), null);
});

test("public site lookup keeps local development fallback", async () => {
  const prisma = {
    site: {
      findFirst: async (query) => {
        if (query.where?.domain === "localhost") {
          return null;
        }

        return { ...site, domain: "store.brand-platform.com" };
      },
      findUnique: async () => null,
    },
  };

  assert.equal(
    (await getPublicSite(prisma, "localhost:3000")).domain,
    "store.brand-platform.com",
  );
});
