import assert from "node:assert/strict";
import test from "node:test";
import { MediaService } from "../dist/modules/media/media.service.js";
import { withEnv } from "./env-helper.mjs";
import {
  createMediaActor,
  createMediaAsset,
} from "./media-test-helpers.mjs";

const actor = createMediaActor();

test("media service returns request ids for confirmed assets", async () => {
  const asset = createMediaAsset({
    id: "asset-confirmed",
    metadata: { alt: "Hero" },
    r2Key: "tenant-1/imports/hero.png",
  });
  const service = new MediaService({
    mediaAsset: {
      create(options) {
        assert.equal(options.data.r2Key, "tenant-1/imports/hero.png");
        return Promise.resolve(asset);
      },
      findFirst(options) {
        assert.deepEqual(options.where, {
          r2Key: "tenant-1/imports/hero.png",
          tenantId: "tenant-1",
        });
        return Promise.resolve(null);
      },
    },
  });

  const confirmed = await service.confirm(
    {
      filename: "hero.png",
      mimeType: "image/png",
      r2Key: "tenant-1/imports/hero.png",
      size: 2048,
    },
    undefined,
    actor,
    "request-media-confirm",
  );

  assert.equal(confirmed.meta.requestId, "request-media-confirm");
  assert.equal(confirmed.data.id, "asset-confirmed");
});

test("media service rejects external registrations on managed CDN hosts", async () => {
  await withEnv(
    {
      MEDIA_CDN_BASE_URL: "https://cdn.example.com/media",
      MEDIA_EXTERNAL_URL_HOSTS: undefined,
    },
    async () => {
      const service = new MediaService({});

      await assert.rejects(
        () =>
          service.confirm(
            {
              filename: "hero.png",
              mimeType: "image/png",
              r2Key: "tenant-1/imports/hero.png",
              size: 2048,
              url: "https://cdn.example.com/tenant-2/private.png",
            },
            undefined,
            actor,
          ),
        (error) => {
          assert.equal(error.getStatus(), 400);
          assert.equal(
            error.getResponse().message,
            "External media URL host is not allowed.",
          );
          return true;
        },
      );
    },
  );
});
