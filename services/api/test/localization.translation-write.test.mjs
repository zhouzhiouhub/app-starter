import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, RequestMethod } from "@nestjs/common";
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from "@nestjs/common/constants.js";
import { apiErrorCodes } from "../../../packages/schema/dist/index.js";
import { AdminApiGuard } from "../dist/common/admin-api.guard.js";
import { REQUIRE_SCOPES_KEY } from "../dist/common/require-scopes.decorator.js";
import { TENANT_ADMIN_PERMISSIONS } from "../dist/modules/identity/identity.constants.js";
import { LocalizationController } from "../dist/modules/localization/localization.controller.js";
import { LocalizationService } from "../dist/modules/localization/localization.service.js";
import { assertApiBadRequest } from "./api-error-test-assertions.mjs";
import { withEnv } from "./env-helper.mjs";
import {
  assertApiConflictRejects,
  createMemoryIdempotencyRecord,
} from "./pages-test-helpers.mjs";

const idempotencyKey = "7f10f6d3-02d9-4f3d-a69d-49b26ec63132";
const actor = {
  email: "admin@example.com",
  id: "user-1",
  name: "Admin",
  roles: ["tenant-admin"],
  scopes: ["translation:read", "translation:write"],
  status: "active",
  tenantId: "tenant-1",
};

test("localization admin routes require guard and read or write scopes", () => {
  const guards = Reflect.getMetadata(GUARDS_METADATA, LocalizationController);

  assert.deepEqual(guards, [AdminApiGuard]);
  assert.deepEqual(readScopes("getMarkets"), ["market:read"]);
  assert.deepEqual(readScopes("getLocales"), ["locale:read"]);
  assert.deepEqual(readScopes("getTranslations"), ["translation:read"]);
  assert.deepEqual(readScopes("upsertTranslation"), ["translation:write"]);
  assert.deepEqual(readScopes("updateTranslation"), ["translation:write"]);
  assert.equal(readRouteMethod("updateTranslation"), RequestMethod.PATCH);
  assert.equal(readRoutePath("updateTranslation"), "translations/:id");
  assert.deepEqual(readScopes("createTranslationImport"), [
    "translation:write",
  ]);
  assert.equal(readRouteMethod("createTranslationImport"), RequestMethod.POST);
  assert.equal(readRoutePath("createTranslationImport"), "translations/import");
  assert.deepEqual(readScopes("createTranslationExport"), ["translation:read"]);
  assert.equal(readRouteMethod("createTranslationExport"), RequestMethod.POST);
  assert.equal(readRoutePath("createTranslationExport"), "translations/export");
  assert.deepEqual(readScopes("previewTranslationImport"), [
    "translation:write",
  ]);
  assert.deepEqual(readScopes("previewTranslationExport"), [
    "translation:read",
  ]);
  assert.deepEqual(readScopes("createLocale"), ["locale:write"]);
  assert.deepEqual(readScopes("updateLocale"), ["locale:write"]);
  assert.equal(readRouteMethod("updateLocale"), RequestMethod.PATCH);
  assert.equal(readRoutePath("updateLocale"), "locales/:id");
  assert.equal(TENANT_ADMIN_PERMISSIONS.includes("translation:write"), true);
});

test("translation upsert writes default locale entries with idempotency", async () => {
  await withEnv(
    { DEFAULT_LOCALE: "en-US", MULTI_LOCALE_ENABLED: "false" },
    async () => {
      const idempotencyCalls = [];
      const auditCalls = [];
      const upsertCalls = [];
      const service = new LocalizationService({
        auditLog: {
          create: async (query) => auditCalls.push(query),
        },
        idempotencyRecord: createMemoryIdempotencyRecord(idempotencyCalls),
        translation: {
          findUnique: async (query) => {
            assert.deepEqual(query, {
              where: {
                tenantId_key_locale: {
                  key: "page.home.hero.title",
                  locale: "en-US",
                  tenantId: "tenant-1",
                },
              },
            });
            return null;
          },
          upsert: async (query) => {
            upsertCalls.push(query);
            return {
              context: query.create.context,
              id: "translation-1",
              key: query.create.key,
              locale: query.create.locale,
              updatedAt: new Date("2026-08-26T00:00:00.000Z"),
              value: query.create.value,
            };
          },
        },
      });
      const input = {
        context: "Homepage hero",
        key: "page.home.hero.title",
        value: "Build better storefronts",
      };

      const first = await service.upsertTranslation(
        input,
        idempotencyKey,
        actor,
        "request-translation-upsert",
      );
      const second = await service.upsertTranslation(
        input,
        idempotencyKey,
        actor,
      );

      assert.deepEqual(upsertCalls, [
        {
          create: {
            context: "Homepage hero",
            key: "page.home.hero.title",
            locale: "en-US",
            tenantId: "tenant-1",
            value: "Build better storefronts",
          },
          update: {
            context: "Homepage hero",
            value: "Build better storefronts",
          },
          where: {
            tenantId_key_locale: {
              key: "page.home.hero.title",
              locale: "en-US",
              tenantId: "tenant-1",
            },
          },
        },
      ]);
      assert.deepEqual(first.data, {
        context: "Homepage hero",
        key: "page.home.hero.title",
        locale: "en-US",
        updatedAt: "2026-08-26T00:00:00.000Z",
        value: "Build better storefronts",
      });
      assert.equal(second.data.key, first.data.key);
      assert.deepEqual(idempotencyCalls, [
        ["findUnique", "translations:en-US:page.home.hero.title:upsert"],
        ["create", "translations:en-US:page.home.hero.title:upsert"],
        ["update", "completed"],
        ["findUnique", "translations:en-US:page.home.hero.title:upsert"],
      ]);
      assert.deepEqual(auditCalls, [
        {
          data: {
            action: "translation.upserted",
            actorId: "user-1",
            metadata: {
              contextConfigured: true,
              key: "page.home.hero.title",
              locale: "en-US",
              writeMode: "created",
            },
            requestId: "request-translation-upsert",
            targetId: "translation-1",
            targetType: "translation",
            tenantId: "tenant-1",
          },
        },
      ]);
      assert.equal(first.meta.writeMode, "created");
    },
  );
});

test("translation upsert reports duplicate keys as updates", async () => {
  await withEnv(
    { DEFAULT_LOCALE: "en-US", MULTI_LOCALE_ENABLED: "false" },
    async () => {
      const service = new LocalizationService({
        auditLog: {
          create: async () => undefined,
        },
        idempotencyRecord: createMemoryIdempotencyRecord(),
        translation: {
          findUnique: async () => ({ id: "translation-1" }),
          upsert: async (query) => ({
            context: query.update.context ?? null,
            id: "translation-1",
            key: query.where.tenantId_key_locale.key,
            locale: query.where.tenantId_key_locale.locale,
            updatedAt: new Date("2026-08-26T00:00:00.000Z"),
            value: query.update.value,
          }),
        },
      });

      const response = await service.upsertTranslation(
        {
          key: "page.home.hero.title",
          value: "Updated storefront headline",
        },
        idempotencyKey,
        actor,
      );

      assert.equal(response.meta.writeMode, "updated");
      assert.equal(response.data.value, "Updated storefront headline");
    },
  );
});

test("translation upsert rejects non-default locale while disabled", async () => {
  await withEnv(
    { DEFAULT_LOCALE: "en-US", MULTI_LOCALE_ENABLED: "false" },
    async () => {
      const service = new LocalizationService(createWritePrisma());

      const error = await assertApiConflictRejects(
        () =>
          service.upsertTranslation(
            {
              key: "page.home.hero.title",
              locale: "de-DE",
              value: "Titel",
            },
            idempotencyKey,
            actor,
          ),
        apiErrorCodes.MULTI_LOCALE_DISABLED,
      );

      assert.match(error.getResponse()?.message, /multi-locale is disabled/);
    },
  );
});

test("translation upsert validates keys and values", async () => {
  const service = new LocalizationService(createWritePrisma());

  for (const input of [
    { key: "Page.home.title", value: "Title" },
    { key: "page.home", value: "" },
    { key: "page.home.title", value: "Title\u0000" },
    { key: "page.home.title", context: "Hero\u0000", value: "Title" },
  ]) {
    await assert.rejects(
      () => service.upsertTranslation(input, idempotencyKey, actor),
      (error) => error instanceof BadRequestException,
    );
  }
});

test("translation upsert controller requires idempotency keys", () => {
  const controller = new LocalizationController(createForwardingService());

  assertApiBadRequest(
    () =>
      controller.upsertTranslation(
        actor,
        {
          key: "page.home.hero.title",
          value: "Build better storefronts",
        },
        undefined,
        "request-missing-idempotency-key",
      ),
    apiErrorCodes.VALIDATION_ERROR,
  );
});

function readScopes(methodName) {
  return Reflect.getMetadata(
    REQUIRE_SCOPES_KEY,
    LocalizationController.prototype[methodName],
  );
}

function readRouteMethod(methodName) {
  return Reflect.getMetadata(
    METHOD_METADATA,
    LocalizationController.prototype[methodName],
  );
}

function readRoutePath(methodName) {
  return Reflect.getMetadata(
    PATH_METADATA,
    LocalizationController.prototype[methodName],
  );
}

function createForwardingService() {
  return {
    upsertTranslation: async () => {
      throw new Error("service should not be called without idempotency.");
    },
  };
}

function createWritePrisma() {
  return {
    auditLog: {
      create: async () => undefined,
    },
    idempotencyRecord: createMemoryIdempotencyRecord(),
    translation: {
      findUnique: async () => null,
      upsert: async () => {
        throw new Error("translation upsert should not run for invalid input.");
      },
    },
  };
}
