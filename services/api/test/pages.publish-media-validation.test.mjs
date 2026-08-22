import assert from "node:assert/strict";
import test from "node:test";
import { createInitialPageSchema } from "../dist/modules/pages/pages.mapper.js";
import { publishPage } from "../dist/modules/pages/use-cases/publish-page.js";
import { createPublishPrisma } from "./pages-publish-test-helpers.mjs";
import { createPageActor } from "./pages-test-helpers.mjs";

test("publishPage validates media references before creating a version", async () => {
  const schema = createInitialPageSchema({
    slug: "launch",
    title: "Launch",
  });
  schema.sections[0].props = {
    image: "media://asset-missing",
  };
  const calls = { audit: null };
  const prisma = createPublishPrisma(calls);

  await assert.rejects(
    () =>
      publishPage(
        prisma,
        "page-1",
        schema,
        undefined,
        createPageActor(),
        undefined,
        async (validatedSchema, tenantId, client) => {
          assert.equal(validatedSchema.meta.slug, "launch");
          assert.equal(
            validatedSchema.sections[0].props.image,
            "media://asset-missing",
          );
          assert.equal(tenantId, "tenant-1");
          assert.equal(typeof client.mediaAsset.findMany, "function");
          throw new Error("Missing media reference.");
        },
      ),
    /Missing media reference/,
  );

  assert.equal(calls.audit, null);
  assert.equal(calls.versionCreate, undefined);
});
