import assert from "node:assert/strict";
import test from "node:test";
import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

test("site settings validation accepts hostnames and rejects URL paths", () => {
  assert.deepEqual(
    parseUpdateSiteSettingsInput({
      domain: "Store.Brand-Platform.com:8080",
      name: "Storefront",
    }),
    {
      domain: "store.brand-platform.com:8080",
      name: "Storefront",
    },
  );

  assert.throws(() =>
    parseUpdateSiteSettingsInput({
      domain: "https://store.example.com/path",
      name: "Storefront",
    }),
  );

  assert.throws(() =>
    parseUpdateSiteSettingsInput({
      domain: "store.example.com",
      name: "Storefront",
    }),
  );

  assert.throws(() =>
    parseUpdateSiteSettingsInput({
      domain: "127.0.0.1",
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
      domain: "store.brand-platform.com",
      name: "Storefront",
    },
    undefined,
    actor,
    "request-site-update",
  );

  assert.equal(response.data.name, "Storefront");
  assert.equal(response.data.domain, "store.brand-platform.com");
  assert.equal(response.meta.siteId, "site-1");
  assert.equal(response.meta.requestId, "request-site-update");
});

test("sites service returns request ids for the current site", async () => {
  const service = new SitesService({
    site: {
      findFirst: async (query) => {
        assert.equal(query.where.tenantId, "tenant-1");
        return site;
      },
    },
  });

  const response = await service.getCurrent(actor, "request-site-current");

  assert.equal(response.data.id, "site-1");
  assert.equal(response.meta.requestId, "request-site-current");
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
      service.updateCurrent(
        { domain: "used.brand-platform.com" },
        undefined,
        actor,
      ),
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
        assert.equal(
          options.data.response.data.domain,
          "store.brand-platform.com",
        );
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
    domain: "store.brand-platform.com",
    name: "Storefront",
  };

  const first = await service.updateCurrent(
    input,
    key,
    actor,
    "request-site-idempotent",
  );
  const second = await service.updateCurrent(input, key, actor);

  assert.equal(first.data.domain, second.data.domain);
  assert.equal(first.meta.requestId, "request-site-idempotent");
  assert.equal(updateCalls, 1);
  assert.deepEqual(idempotencyCalls, [
    ["findUnique", "sites:current:update"],
    ["create", "sites:current:update"],
    ["update", "completed"],
    ["findUnique", "sites:current:update"],
  ]);
});
