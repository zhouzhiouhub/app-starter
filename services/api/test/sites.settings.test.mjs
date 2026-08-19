import assert from "node:assert/strict";
import test from "node:test";
import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  getPublicDefaultSite,
  getSiteForTenant,
} from "../dist/modules/pages/pages.site.js";
import { toSiteSettingsResponse } from "../dist/modules/sites/sites.mapper.js";
import { SitesService } from "../dist/modules/sites/sites.service.js";
import { parseUpdateSiteSettingsInput } from "../dist/modules/sites/sites.validation.js";

const site = {
  createdAt: new Date("2026-08-19T00:00:00.000Z"),
  domain: "localhost",
  id: "site-1",
  name: "Default Site",
  tenantId: "tenant-1",
};

const actor = {
  email: "admin@example.com",
  id: "user-1",
  name: "Admin",
  roles: ["tenant-admin"],
  scopes: ["site:read", "site:write"],
  status: "active",
  tenantId: "tenant-1",
};

test("site settings response includes runtime defaults and feature flags", () => {
  withEnv(
    {
      COMMERCE_ENABLED: "false",
      DEFAULT_CURRENCY: "USD",
      DEFAULT_LOCALE: "en-US",
      DEFAULT_MARKET: "us",
      FALLBACK_LOCALE: "en-US",
      MULTI_LOCALE_ENABLED: "false",
    },
    () => {
      assert.deepEqual(toSiteSettingsResponse(site), {
        createdAt: "2026-08-19T00:00:00.000Z",
        defaults: {
          currency: "USD",
          fallbackLocale: "en-US",
          locale: "en-US",
          market: "us",
        },
        domain: "localhost",
        featureFlags: {
          commerceEnabled: false,
          multiLocaleEnabled: false,
        },
        id: "site-1",
        name: "Default Site",
        tenantId: "tenant-1",
      });
    },
  );
});

test("site settings validation accepts hostnames and rejects URL paths", () => {
  assert.deepEqual(
    parseUpdateSiteSettingsInput({
      domain: "Store.Example.com:8080",
      name: "Storefront",
    }),
    {
      domain: "store.example.com:8080",
      name: "Storefront",
    },
  );

  assert.throws(() =>
    parseUpdateSiteSettingsInput({
      domain: "https://store.example.com/path",
      name: "Storefront",
    }),
  );
});

test("sites service updates the current tenant site", async () => {
  const prisma = {
    site: {
      findFirst: async (query) => {
        assert.equal(query.where.tenantId, "tenant-1");
        return site;
      },
      update: async (query) => ({
        ...site,
        ...query.data,
      }),
    },
  };
  const service = new SitesService(prisma);
  const response = await service.updateCurrent(
    {
      domain: "store.example.com",
      name: "Storefront",
    },
    actor,
  );

  assert.equal(response.data.name, "Storefront");
  assert.equal(response.data.domain, "store.example.com");
  assert.equal(response.meta.siteId, "site-1");
});

test("sites service maps duplicate domains to conflicts", async () => {
  const prisma = {
    site: {
      findFirst: async () => site,
      update: async () => {
        throw new Prisma.PrismaClientKnownRequestError("duplicate", {
          clientVersion: "5.22.0",
          code: "P2002",
        });
      },
    },
  };
  const service = new SitesService(prisma);

  await assert.rejects(
    () => service.updateCurrent({ domain: "used.example.com" }, actor),
    (error) => error instanceof ConflictException,
  );
});

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

  assert.equal((await getPublicDefaultSite(prisma)).domain, "store.example.com");
});

function withEnv(values, fn) {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );

  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }

  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
