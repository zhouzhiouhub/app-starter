import assert from "node:assert/strict";
import test from "node:test";
import { createInitialPageSchema } from "../dist/modules/pages/pages.mapper.js";
import { publishPage } from "../dist/modules/pages/use-cases/publish-page.js";
import { createPublishPrisma } from "./pages-publish-test-helpers.mjs";
import { createPageActor } from "./pages-test-helpers.mjs";

test("publishPage records a page published audit log", async () => {
  const schema = createInitialPageSchema({
    slug: "launch",
    title: "Launch",
  });
  const calls = { audit: null };
  const prisma = createPublishPrisma(calls);

  const response = await publishPage(
    prisma,
    "page-1",
    schema,
    undefined,
    createPageActor(),
    async () => ({
      paths: ["/en/launch"],
      tags: ["published-page"],
      triggered: true,
    }),
    undefined,
    "request-publish-1",
  );

  assert.equal(calls.audit.action, "page.published");
  assert.equal(calls.audit.actorId, "user-1");
  assert.equal(calls.audit.targetId, "page-1");
  assert.equal(calls.audit.targetType, "page");
  assert.equal(calls.audit.tenantId, "tenant-1");
  assert.equal(calls.audit.metadata.siteId, "site-1");
  assert.equal(calls.audit.metadata.slug, "launch");
  assert.equal(calls.audit.metadata.market, "us");
  assert.equal(calls.audit.metadata.locale, "en-US");
  assert.equal(calls.audit.metadata.publishedVersionId, "version-2");
  assert.equal(calls.audit.requestId, "request-publish-1");
  assert.equal(response.meta.requestId, "request-publish-1");
  assert.equal("schema" in calls.audit.metadata, false);
});

test("publishPage does not revalidate storefront when audit logging fails", async () => {
  const schema = createInitialPageSchema({
    slug: "launch",
    title: "Launch",
  });
  const calls = { audit: null, revalidationTriggered: false };
  const prisma = createPublishPrisma(calls, {
    auditCreate: async (input) => {
      calls.audit = input.data;
      throw new Error("Audit write failed.");
    },
  });

  await assert.rejects(
    () =>
      publishPage(
        prisma,
        "page-1",
        schema,
        undefined,
        createPageActor(),
        async () => {
          calls.revalidationTriggered = true;
          return {
            paths: ["/en/launch"],
            tags: ["published-page"],
            triggered: true,
          };
        },
      ),
    /Audit write failed/,
  );

  assert.equal(calls.audit.action, "page.published");
  assert.equal(calls.revalidationTriggered, false);
});
