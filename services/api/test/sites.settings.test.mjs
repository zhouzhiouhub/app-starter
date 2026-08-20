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
      ANALYTICS_CONSENT_GRANTED: " FALSE ",
      ANALYTICS_ENABLED: " TRUE ",
      CLARITY_PROJECT_ID: " clarity123 ",
      DEFAULT_CURRENCY: "USD",
      DEFAULT_LOCALE: "en-US",
      DEFAULT_MARKET: "us",
      FALLBACK_LOCALE: "en-US",
      GA4_MEASUREMENT_ID: " G-ABC1234567 ",
      GTM_CONTAINER_ID: " GTM-ABC1234 ",
      MULTI_LOCALE_ENABLED: "false",
    },
    () => {
      assert.deepEqual(toSiteSettingsResponse(site), {
        analytics: {
          clarityProjectId: "clarity123",
          consentGranted: false,
          enabled: true,
          ga4MeasurementId: "G-ABC1234567",
          gtmContainerId: "GTM-ABC1234",
        },
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

test("site settings response ignores invalid analytics provider ids", () => {
  withEnv(
    {
      ANALYTICS_CONSENT_GRANTED: "true",
      ANALYTICS_ENABLED: "true",
      CLARITY_PROJECT_ID: "clarity-123",
      GA4_MEASUREMENT_ID: "GA-123",
      GTM_CONTAINER_ID: "https://tag.example.com",
    },
    () => {
      assert.deepEqual(toSiteSettingsResponse(site).analytics, {
        clarityProjectId: null,
        consentGranted: true,
        enabled: true,
        ga4MeasurementId: null,
        gtmContainerId: null,
      });
    },
  );
});

test("site settings response normalizes feature flag environment values", () => {
  withEnv(
    {
      COMMERCE_ENABLED: " TRUE ",
      MULTI_LOCALE_ENABLED: " TRUE ",
    },
    () => {
      assert.deepEqual(toSiteSettingsResponse(site).featureFlags, {
        commerceEnabled: true,
        multiLocaleEnabled: true,
      });
    },
  );
});

test("site settings response rejects misspelled boolean environment values", () => {
  withEnv(
    {
      ANALYTICS_ENABLED: "treu",
    },
    () => {
      assert.throws(
        () => toSiteSettingsResponse(site),
        /ANALYTICS_ENABLED must be true or false/,
      );
    },
  );
});

test("site settings response ignores invalid runtime defaults", () => {
  withEnv(
    {
      DEFAULT_CURRENCY: "usd",
      DEFAULT_LOCALE: "bad_locale",
      DEFAULT_MARKET: "US",
      FALLBACK_LOCALE: "still_bad",
    },
    () => {
      assert.deepEqual(toSiteSettingsResponse(site).defaults, {
        currency: "USD",
        fallbackLocale: "en-US",
        locale: "en-US",
        market: "us",
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
    undefined,
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
    () =>
      service.updateCurrent({ domain: "used.example.com" }, undefined, actor),
    (error) => error instanceof ConflictException,
  );
});

test("sites service stores update responses by idempotency key", async () => {
  const idempotencyCalls = [];
  let storedRecord = null;
  let updateCalls = 0;
  const prisma = {
    idempotencyRecord: {
      findUnique(options) {
        idempotencyCalls.push([
          "findUnique",
          options.where.tenantId_scope_key.scope,
        ]);
        return Promise.resolve(storedRecord);
      },
      create(options) {
        idempotencyCalls.push(["create", options.data.scope]);
        storedRecord = {
          id: "idem-1",
          requestHash: options.data.requestHash,
          response: null,
          status: "pending",
        };
        return Promise.resolve({ id: "idem-1" });
      },
      update(options) {
        idempotencyCalls.push(["update", options.data.status]);
        assert.equal(options.data.response.data.domain, "store.example.com");
        storedRecord = {
          ...storedRecord,
          response: options.data.response,
          status: options.data.status,
        };
        return Promise.resolve(storedRecord);
      },
      deleteMany() {
        throw new Error(
          "deleteMany should not run for successful site update.",
        );
      },
    },
    site: {
      findFirst: async () => site,
      update: async (query) => {
        updateCalls += 1;
        return {
          ...site,
          ...query.data,
        };
      },
    },
  };
  const service = new SitesService(prisma);
  const key = "b4f7a547-c365-42cf-9322-762f1d8f5834";
  const input = {
    domain: "store.example.com",
    name: "Storefront",
  };

  const first = await service.updateCurrent(input, key, actor);
  const second = await service.updateCurrent(input, key, actor);

  assert.equal(first.data.domain, second.data.domain);
  assert.equal(updateCalls, 1);
  assert.deepEqual(idempotencyCalls, [
    ["findUnique", "sites:current:update"],
    ["create", "sites:current:update"],
    ["update", "completed"],
    ["findUnique", "sites:current:update"],
  ]);
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

  assert.equal(
    (await getPublicDefaultSite(prisma)).domain,
    "store.example.com",
  );
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
