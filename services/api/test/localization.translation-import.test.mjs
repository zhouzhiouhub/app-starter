import assert from "node:assert/strict";
import test from "node:test";
import { apiErrorCodes } from "../../../packages/schema/dist/index.js";
import { LocalizationController } from "../dist/modules/localization/localization.controller.js";
import { LocalizationService } from "../dist/modules/localization/localization.service.js";
import { assertApiBadRequest } from "./api-error-test-assertions.mjs";
import { withEnv } from "./env-helper.mjs";
import {
  assertApiConflictRejects,
  createMemoryIdempotencyRecord,
} from "./pages-test-helpers.mjs";

const idempotencyKey = "f29287c0-e889-44fd-9101-9220ca2f0505";
const actor = {
  email: "admin@example.com",
  id: "user-1",
  name: "Admin",
  roles: ["tenant-admin"],
  scopes: ["translation:read", "translation:write"],
  status: "active",
  tenantId: "tenant-1",
};

test("translation import writes default locale entries with idempotency", async () => {
  await withEnv(
    { DEFAULT_LOCALE: "en-US", MULTI_LOCALE_ENABLED: "false" },
    async () => {
      const auditCalls = [];
      const idempotencyCalls = [];
      const storedKeyQueries = [];
      const upsertCalls = [];
      const service = new LocalizationService({
        auditLog: {
          create: async (query) => auditCalls.push(query),
        },
        idempotencyRecord: createMemoryIdempotencyRecord(idempotencyCalls),
        translation: {
          findMany: async (query) => {
            storedKeyQueries.push(query);
            return [{ key: "page.home.hero.title", locale: "en-US" }];
          },
          upsert: async (query) => {
            upsertCalls.push(query);

            return {
              context: query.update.context ?? query.create.context,
              id: query.where.tenantId_key_locale.key.endsWith(".title")
                ? "translation-title"
                : "translation-body",
              key: query.where.tenantId_key_locale.key,
              locale: query.where.tenantId_key_locale.locale,
              updatedAt: new Date("2026-08-27T00:00:00.000Z"),
              value: query.update.value,
            };
          },
        },
      });
      const input = {
        entries: [
          {
            context: "Homepage hero",
            key: "page.home.hero.title",
            locale: "en-US",
            value: "Updated title",
          },
          {
            key: "page.home.hero.body",
            value: "New body",
          },
        ],
      };

      const first = await service.importTranslations(
        input,
        idempotencyKey,
        actor,
        "request-translation-import",
      );
      const second = await service.importTranslations(
        input,
        idempotencyKey,
        actor,
      );

      assert.deepEqual(storedKeyQueries, [
        {
          select: { key: true, locale: true },
          where: {
            OR: [
              {
                key: "page.home.hero.title",
                locale: "en-US",
                tenantId: "tenant-1",
              },
              {
                key: "page.home.hero.body",
                locale: "en-US",
                tenantId: "tenant-1",
              },
            ],
          },
        },
        {
          select: { key: true, locale: true },
          where: {
            OR: [
              {
                key: "page.home.hero.title",
                locale: "en-US",
                tenantId: "tenant-1",
              },
              {
                key: "page.home.hero.body",
                locale: "en-US",
                tenantId: "tenant-1",
              },
            ],
          },
        },
      ]);
      assert.deepEqual(upsertCalls, [
        {
          create: {
            context: "Homepage hero",
            key: "page.home.hero.title",
            locale: "en-US",
            tenantId: "tenant-1",
            value: "Updated title",
          },
          update: {
            context: "Homepage hero",
            value: "Updated title",
          },
          where: {
            tenantId_key_locale: {
              key: "page.home.hero.title",
              locale: "en-US",
              tenantId: "tenant-1",
            },
          },
        },
        {
          create: {
            context: null,
            key: "page.home.hero.body",
            locale: "en-US",
            tenantId: "tenant-1",
            value: "New body",
          },
          update: {
            value: "New body",
          },
          where: {
            tenantId_key_locale: {
              key: "page.home.hero.body",
              locale: "en-US",
              tenantId: "tenant-1",
            },
          },
        },
      ]);
      assert.deepEqual(first.data.summary, {
        createdCount: 1,
        importedCount: 2,
        totalEntries: 2,
        updatedCount: 1,
      });
      assert.deepEqual(
        first.data.entries.map((entry) => ({
          action: entry.action,
          context: entry.context,
          index: entry.index,
          key: entry.key,
          locale: entry.locale,
          value: entry.value,
        })),
        [
          {
            action: "update",
            context: "Homepage hero",
            index: 0,
            key: "page.home.hero.title",
            locale: "en-US",
            value: "Updated title",
          },
          {
            action: "create",
            context: null,
            index: 1,
            key: "page.home.hero.body",
            locale: "en-US",
            value: "New body",
          },
        ],
      );
      assert.deepEqual(second, first);
      assert.deepEqual(idempotencyCalls, [
        ["findUnique", "translations:import"],
        ["create", "translations:import"],
        ["update", "completed"],
        ["findUnique", "translations:import"],
      ]);
      assert.deepEqual(auditCalls, [
        {
          data: {
            action: "translation.imported",
            actorId: "user-1",
            metadata: {
              createdCount: 1,
              defaultLocale: "en-US",
              importedCount: 2,
              multiLocaleEnabled: false,
              totalEntries: 2,
              updatedCount: 1,
            },
            requestId: "request-translation-import",
            targetId: "translations",
            targetType: "translation-import",
            tenantId: "tenant-1",
          },
        },
      ]);
      assert.equal(JSON.stringify(auditCalls).includes("Updated title"), false);
      assert.equal(first.meta.importVersion, "translation-import.v1");
    },
  );
});

test("translation import rejects duplicate rows without echoing values", async () => {
  const auditCalls = [];
  const upsertCalls = [];
  const service = new LocalizationService({
    auditLog: {
      create: async (query) => auditCalls.push(query),
    },
    idempotencyRecord: createMemoryIdempotencyRecord(),
    translation: {
      findMany: async () => [],
      upsert: async (query) => upsertCalls.push(query),
    },
  });
  let caught;

  await assert.rejects(
    () =>
      service.importTranslations(
        {
          entries: [
            {
              key: "page.home.hero.title",
              value: "Secret title",
            },
            {
              key: "page.home.hero.title",
              value: "Secret duplicate",
            },
          ],
        },
        idempotencyKey,
        actor,
        "request-duplicate-import",
      ),
    (error) => {
      caught = error;
      return (
        error.getStatus?.() === 400 &&
        error.getResponse?.().code === apiErrorCodes.VALIDATION_ERROR
      );
    },
  );

  assert.equal(caught.getResponse().details.summary.duplicateCount, 1);
  assert.equal(JSON.stringify(caught.getResponse()).includes("Secret"), false);
  assert.deepEqual(auditCalls, []);
  assert.deepEqual(upsertCalls, []);
});

test("translation import blocks non-default locale rows while disabled", async () => {
  await withEnv(
    { DEFAULT_LOCALE: "en-US", MULTI_LOCALE_ENABLED: "false" },
    async () => {
      const service = new LocalizationService({
        translation: {
          findMany: async () => {
            throw new Error("blocked rows should not query stored keys.");
          },
        },
      });

      const error = await assertApiConflictRejects(
        () =>
          service.importTranslations(
            {
              entries: [
                {
                  key: "page.home.hero.title",
                  locale: "de-DE",
                  value: "Titel",
                },
              ],
            },
            idempotencyKey,
            actor,
            "request-blocked-import",
          ),
        apiErrorCodes.MULTI_LOCALE_DISABLED,
      );

      assert.equal(error.getResponse().details.summary.blockedCount, 1);
      assert.equal(
        JSON.stringify(error.getResponse()).includes("Titel"),
        false,
      );
    },
  );
});

test("translation import controller requires idempotency and forwards writes", async () => {
  const calls = [];
  const controller = new LocalizationController({
    importTranslations: async (body, key, currentActor, requestId) => {
      calls.push({ body, currentActor, key, requestId });
      return { data: { summary: { importedCount: 0 } } };
    },
  });

  assertApiBadRequest(
    () =>
      controller.createTranslationImport(
        actor,
        { entries: [] },
        undefined,
        "request-missing-import-idempotency-key",
      ),
    apiErrorCodes.VALIDATION_ERROR,
  );

  const response = await controller.createTranslationImport(
    actor,
    { entries: [] },
    idempotencyKey,
    "request-controller-import",
  );

  assert.deepEqual(response, { data: { summary: { importedCount: 0 } } });
  assert.deepEqual(calls, [
    {
      body: { entries: [] },
      currentActor: actor,
      key: idempotencyKey,
      requestId: "request-controller-import",
    },
  ]);
});
