import assert from "node:assert/strict";
import test from "node:test";
import { apiErrorCodes } from "../../../packages/schema/dist/index.js";
import { createInitialPageSchema } from "../dist/modules/pages/pages.mapper.js";
import { publishPage } from "../dist/modules/pages/use-cases/publish-page.js";
import { withEnv } from "./env-helper.mjs";
import { createPublishPrisma } from "./pages-publish-test-helpers.mjs";
import {
  assertApiConflictRejects,
  createPageActor,
  withPageLocale,
} from "./pages-test-helpers.mjs";

test("publishPage rejects non-default locale while multi-locale is disabled", async () => {
  await withEnv(
    {
      DEFAULT_LOCALE: "en-US",
      MULTI_LOCALE_ENABLED: "false",
    },
    async () => {
      const schema = withPageLocale(
        createInitialPageSchema({
          slug: "launch",
          title: "Launch",
        }),
        "de-DE",
      );
      const calls = { audit: null };
      const prisma = createPublishPrisma(calls);

      const error = await assertApiConflictRejects(
        () =>
          publishPage(
            prisma,
            "page-1",
            schema,
            undefined,
            createPageActor(),
            undefined,
            undefined,
            "request-publish-locale-disabled",
          ),
        apiErrorCodes.MULTI_LOCALE_DISABLED,
      );

      assert.equal(
        error.getResponse()?.requestId,
        "request-publish-locale-disabled",
      );
      assert.equal(calls.audit, null);
      assert.equal(calls.versionCreate, undefined);
    },
  );
});

test("publishPage allows non-default locale when multi-locale flag is normalized", async () => {
  await withEnv(
    {
      DEFAULT_LOCALE: "en-US",
      MULTI_LOCALE_ENABLED: " TRUE ",
    },
    async () => {
      const schema = withPageLocale(
        createInitialPageSchema({
          slug: "launch",
          title: "Launch",
        }),
        "de-DE",
      );
      const calls = { audit: null };
      const prisma = createPublishPrisma(calls);

      await publishPage(
        prisma,
        "page-1",
        schema,
        undefined,
        createPageActor(),
      );

      assert.equal(calls.versionCreate.status, "published");
      assert.equal(calls.audit.metadata.locale, "de-DE");
    },
  );
});

test("publishPage ignores invalid default locale configuration", async () => {
  await withEnv(
    {
      DEFAULT_LOCALE: "bad_locale",
      MULTI_LOCALE_ENABLED: "false",
    },
    async () => {
      const schema = createInitialPageSchema({
        slug: "launch",
        title: "Launch",
      });
      const calls = { audit: null };
      const prisma = createPublishPrisma(calls);

      await publishPage(
        prisma,
        "page-1",
        schema,
        undefined,
        createPageActor(),
      );

      assert.equal(calls.versionCreate.status, "published");
      assert.equal(calls.audit.action, "page.published");
    },
  );
});
