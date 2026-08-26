import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, ConflictException } from "@nestjs/common";
import {
  apiErrorCodes,
  translationEntryMaxCount,
} from "../../../packages/schema/dist/index.js";
import { LocalizationController } from "../dist/modules/localization/localization.controller.js";
import { LocalizationService } from "../dist/modules/localization/localization.service.js";
import { assertApiConflictRejects } from "./pages-test-helpers.mjs";

const actor = {
  email: "admin@example.com",
  id: "user-1",
  name: "Admin",
  roles: ["tenant-admin"],
  scopes: ["translation:read", "translation:write"],
  status: "active",
  tenantId: "tenant-1",
};

test("admin translations expose an empty key list for the default locale", async () => {
  const queries = [];
  const service = new LocalizationService({
    translation: {
      findMany: async (query) => {
        queries.push(query);
        return [];
      },
    },
  });

  const response = await service.listTranslations(
    actor,
    { locale: "en-US" },
    "request-empty-translation-keys",
  );

  assert.deepEqual(response.data, []);
  assert.deepEqual(queries, [
    {
      orderBy: { key: "asc" },
      take: translationEntryMaxCount,
      where: {
        locale: "en-US",
        tenantId: "tenant-1",
      },
    },
  ]);
  assert.equal(response.meta.entryLimit, translationEntryMaxCount);
  assert.equal(response.meta.isFallback, false);
  assert.equal(response.meta.locale, "en-US");
  assert.equal(response.meta.requestId, "request-empty-translation-keys");
});

test("admin translations filter by namespace and search query", async () => {
  const queries = [];
  const service = new LocalizationService({
    translation: {
      findMany: async (query) => {
        queries.push(query);
        return [];
      },
    },
  });

  const response = await service.listTranslations(
    actor,
    {
      locale: "en-US",
      namespace: "page.home",
      q: "hero",
    },
    "request-filtered-translation-keys",
  );

  assert.deepEqual(queries, [
    {
      orderBy: { key: "asc" },
      take: translationEntryMaxCount,
      where: {
        AND: [
          {
            OR: [{ key: "page.home" }, { key: { startsWith: "page.home." } }],
          },
          {
            OR: [
              { key: { contains: "hero" } },
              { value: { contains: "hero" } },
              { context: { contains: "hero" } },
            ],
          },
        ],
        locale: "en-US",
        tenantId: "tenant-1",
      },
    },
  ]);
  assert.equal(response.meta.namespace, "page.home");
  assert.equal(response.meta.query, "hero");
});

test("admin translations validate namespace and search filters", async () => {
  const service = new LocalizationService({
    translation: {
      findMany: async () => {
        throw new Error("translation list should not run for invalid filters.");
      },
    },
  });

  for (const query of [
    { locale: "en-US", namespace: "Page.home" },
    { locale: "en-US", namespace: "page..home" },
    { locale: "en-US", q: "hero\u0000title" },
  ]) {
    await assert.rejects(
      () => service.listTranslations(actor, query),
      (error) => error instanceof BadRequestException,
    );
  }
});

test("translation import and export stay explicit reserved contracts", async () => {
  const controller = new LocalizationController(createForwardingService());

  for (const [callback, operation] of [
    [
      () => controller.createTranslationImport("request-translation-import"),
      "import",
    ],
    [
      () => controller.createTranslationExport("request-translation-export"),
      "export",
    ],
  ]) {
    const error = await assertApiConflictRejects(
      callback,
      apiErrorCodes.CONFLICT,
    );

    assert.match(error.getResponse()?.message, new RegExp(operation));
  }
});

function createForwardingService() {
  return {
    rejectTranslationBulkOperation: async (operation, requestId) => {
      throw new ConflictException({
        code: apiErrorCodes.CONFLICT,
        message: `Translation ${operation} is reserved for a later localization phase.`,
        requestId,
      });
    },
  };
}
