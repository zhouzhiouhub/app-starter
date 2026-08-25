import assert from "node:assert/strict";
import test from "node:test";
import {
  apiErrorCodes,
  createFallbackPage,
} from "../../../packages/schema/dist/index.js";
import { rollbackPage } from "../dist/modules/pages/use-cases/rollback-page.js";
import { createRollbackPrisma } from "./pages-versioning-test-helpers.mjs";
import { createPageActor } from "./pages-test-helpers.mjs";

test("rollbackPage rejects HTTP image sources before creating a version", async () => {
  const schema = createFallbackPage({ slug: "home", title: "Previous Home" });
  schema.seo.ogImage = "http://cdn.example.com/og.jpg";
  schema.sections = [
    {
      id: "gallery",
      component: "image-gallery",
      props: {
        images: [{ alt: "Gallery", src: "http://cdn.example.com/hero.jpg" }],
      },
      layout: {
        desktop: { x: 0, y: 0, width: 1200 },
        mobile: { x: 0, y: 0, width: 390 },
      },
    },
  ];
  const calls = {
    audit: false,
    versionCreate: false,
  };
  const prisma = createRollbackPrisma({
    onAudit: () => {
      calls.audit = true;
      throw new Error("audit should not be written for rejected rollbacks.");
    },
    onCreateVersion: () => {
      calls.versionCreate = true;
      throw new Error("version should not be created for rejected rollbacks.");
    },
    target: {
      id: "version-1",
      pageId: "page-1",
      schema,
      status: "published",
    },
  });

  await assert.rejects(
    () =>
      rollbackPage(
        prisma,
        "page-1",
        { versionId: "version-1" },
        undefined,
        createPageActor(),
      ),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(error.getResponse().code, apiErrorCodes.VALIDATION_ERROR);
      assert.deepEqual(error.getResponse().details.invalidImageSources, [
        { field: "seo.ogImage", reason: "http_requires_https" },
        {
          field: "sections[0].props.images[0].src",
          reason: "http_requires_https",
        },
      ]);

      return true;
    },
  );
  assert.equal(calls.audit, false);
  assert.equal(calls.versionCreate, false);
});

test("rollbackPage rejects signed image URLs before creating a version", async () => {
  const schema = createFallbackPage({ slug: "home", title: "Previous Home" });
  schema.sections = [
    {
      id: "gallery",
      component: "image-gallery",
      props: {
        images: [
          {
            alt: "Signed",
            src: "https://cdn.example.com/hero.jpg?X-Amz-Signature=signed",
          },
        ],
      },
      layout: {
        desktop: { x: 0, y: 0, width: 1200 },
        mobile: { x: 0, y: 0, width: 390 },
      },
    },
  ];
  const calls = {
    audit: false,
    versionCreate: false,
  };
  const prisma = createRollbackPrisma({
    onAudit: () => {
      calls.audit = true;
      throw new Error("audit should not be written for rejected rollbacks.");
    },
    onCreateVersion: () => {
      calls.versionCreate = true;
      throw new Error("version should not be created for rejected rollbacks.");
    },
    target: {
      id: "version-1",
      pageId: "page-1",
      schema,
      status: "published",
    },
  });

  await assert.rejects(
    () =>
      rollbackPage(
        prisma,
        "page-1",
        { versionId: "version-1" },
        undefined,
        createPageActor(),
      ),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(error.getResponse().code, apiErrorCodes.VALIDATION_ERROR);
      assert.deepEqual(error.getResponse().details.invalidImageSources, [
        {
          field: "sections[0].props.images[0].src",
          reason: "sensitive_query_parameter",
        },
      ]);

      return true;
    },
  );
  assert.equal(calls.audit, false);
  assert.equal(calls.versionCreate, false);
});
