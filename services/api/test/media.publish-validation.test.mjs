import assert from "node:assert/strict";
import test from "node:test";
import { createFallbackPage } from "@app-starter/schema";
import { MediaService } from "../dist/modules/media/media.service.js";
import { createMediaAsset } from "./media-test-helpers.mjs";

test("media service blocks publishing schemas with missing or archived media", async () => {
  const schema = createFallbackPage({
    slug: "campaign",
    title: "Campaign",
  });
  schema.sections[0].props = {
    heroImage: "media://asset-1",
    gallery: ["media://asset-missing", "media://asset-archived"],
  };
  const service = new MediaService({
    mediaAsset: {
      findMany(options) {
        assert.deepEqual(options.where, {
          id: {
            in: ["asset-1", "asset-missing", "asset-archived"],
          },
          tenantId: "tenant-1",
        });
        return Promise.resolve([
          createMediaAsset(),
          createMediaAsset({
            id: "asset-archived",
            metadata: {
              archivedAt: "2026-08-19T00:00:00.000Z",
            },
          }),
        ]);
      },
    },
  });

  await assert.rejects(
    () => service.assertSchemaMediaReferencesPublishable(schema, "tenant-1"),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(
        error.getResponse().message,
        "Page references missing or archived media assets.",
      );
      assert.deepEqual(error.getResponse().details, {
        archivedReferences: ["media://asset-archived"],
        missingReferences: ["media://asset-missing"],
      });
      return true;
    },
  );
});
