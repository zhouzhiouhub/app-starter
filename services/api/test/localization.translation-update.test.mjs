import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { apiErrorCodes } from "../../../packages/schema/dist/index.js";
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

test("translation update writes default locale entries by id with idempotency", async () => {
  await withEnv(
    { DEFAULT_LOCALE: "en-US", MULTI_LOCALE_ENABLED: "false" },
    async () => {
      const auditCalls = [];
      const findCalls = [];
      const idempotencyCalls = [];
      const updateCalls = [];
      const service = new LocalizationService({
        auditLog: {
          create: async (query) => auditCalls.push(query),
        },
        idempotencyRecord: createMemoryIdempotencyRecord(idempotencyCalls),
        translation: {
          findFirst: async (query) => {
            findCalls.push(query);
            return {
              context: "Homepage hero",
              id: "translation-1",
              key: "page.home.hero.title",
              locale: "en-US",
              value: "Build better storefronts",
            };
          },
          update: async (query) => {
            updateCalls.push(query);
            return {
              context: query.data.context,
              id: "translation-1",
              key: "page.home.hero.title",
              locale: "en-US",
              updatedAt: new Date("2026-08-26T00:00:00.000Z"),
              value: query.data.value,
            };
          },
        },
      });
      const input = {
        context: null,
        value: "Updated storefront headline",
      };

      const first = await service.updateTranslation(
        "translation-1",
        input,
        idempotencyKey,
        actor,
        "request-translation-update",
      );
      const second = await service.updateTranslation(
        "translation-1",
        input,
        idempotencyKey,
        actor,
      );

      assert.deepEqual(findCalls, [
        {
          where: {
            id: "translation-1",
            tenantId: "tenant-1",
          },
        },
      ]);
      assert.deepEqual(updateCalls, [
        {
          data: {
            context: null,
            value: "Updated storefront headline",
          },
          where: {
            id: "translation-1",
          },
        },
      ]);
      assert.deepEqual(first.data, {
        context: null,
        key: "page.home.hero.title",
        locale: "en-US",
        updatedAt: "2026-08-26T00:00:00.000Z",
        value: "Updated storefront headline",
      });
      assert.equal(second.data.value, first.data.value);
      assert.deepEqual(idempotencyCalls, [
        ["findUnique", "translations:translation-1:update"],
        ["create", "translations:translation-1:update"],
        ["update", "completed"],
        ["findUnique", "translations:translation-1:update"],
      ]);
      assert.deepEqual(auditCalls, [
        {
          data: {
            action: "translation.updated",
            actorId: "user-1",
            metadata: {
              contextChanged: true,
              contextConfigured: false,
              key: "page.home.hero.title",
              locale: "en-US",
              valueChanged: true,
            },
            requestId: "request-translation-update",
            targetId: "translation-1",
            targetType: "translation",
            tenantId: "tenant-1",
          },
        },
      ]);
      assert.equal(
        JSON.stringify(auditCalls).includes("Updated storefront"),
        false,
      );
      assert.equal(first.meta.writeMode, "updated");
    },
  );
});

test("translation update returns tenant-scoped not found errors without leaking ids", async () => {
  const service = new LocalizationService({
    auditLog: {
      create: async () => {
        throw new Error("audit should not run for missing translations.");
      },
    },
    translation: {
      findFirst: async (query) => {
        assert.deepEqual(query, {
          where: {
            id: "translation-secret",
            tenantId: "tenant-1",
          },
        });
        return null;
      },
      update: async () => {
        throw new Error("translation update should not run when missing.");
      },
    },
  });

  await assert.rejects(
    () =>
      service.updateTranslation(
        "translation-secret",
        { value: "Updated storefront headline" },
        undefined,
        actor,
        "request-translation-update-missing",
      ),
    (error) =>
      error.getStatus?.() === 404 &&
      error.getResponse?.().code === apiErrorCodes.NOT_FOUND &&
      error.getResponse?.().requestId ===
        "request-translation-update-missing" &&
      !JSON.stringify(error.getResponse()).includes("translation-secret"),
  );
});

test("translation update rejects non-default locale rows while disabled", async () => {
  await withEnv(
    { DEFAULT_LOCALE: "en-US", MULTI_LOCALE_ENABLED: "false" },
    async () => {
      const service = new LocalizationService({
        translation: {
          findFirst: async () => ({
            context: null,
            id: "translation-1",
            key: "page.home.hero.title",
            locale: "de-DE",
            value: "Titel",
          }),
          update: async () => {
            throw new Error(
              "translation update should not run while locale is disabled.",
            );
          },
        },
      });

      const error = await assertApiConflictRejects(
        () =>
          service.updateTranslation(
            "translation-1",
            { value: "Titel aktualisiert" },
            undefined,
            actor,
          ),
        apiErrorCodes.MULTI_LOCALE_DISABLED,
      );

      assert.match(error.getResponse()?.message, /multi-locale is disabled/);
    },
  );
});

test("translation update validates ids and partial bodies", async () => {
  const service = new LocalizationService({
    translation: {
      findFirst: async () => {
        throw new Error("translation lookup should not run for invalid input.");
      },
    },
  });

  for (const [id, body] of [
    ["translation/1", { value: "Title" }],
    ["translation-1", {}],
    ["translation-1", { value: "" }],
    ["translation-1", { value: "Title\u0000" }],
    ["translation-1", { context: "Hero\u0000" }],
    ["translation-1", null],
  ]) {
    await assert.rejects(
      () => service.updateTranslation(id, body, undefined, actor),
      (error) => error instanceof BadRequestException,
    );
  }
});

test("translation update controller requires idempotency keys", () => {
  const controller = new LocalizationController({
    updateTranslation: async () => {
      throw new Error("service should not be called without idempotency.");
    },
  });

  assertApiBadRequest(
    () =>
      controller.updateTranslation(
        actor,
        "translation-1",
        { value: "Updated storefront headline" },
        undefined,
        "request-missing-idempotency-key",
      ),
    apiErrorCodes.VALIDATION_ERROR,
  );
});
