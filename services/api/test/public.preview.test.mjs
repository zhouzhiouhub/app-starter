import assert from "node:assert/strict";
import test from "node:test";
import { PublicController } from "../dist/modules/public/public.controller.js";

test("public preview response carries the current request id", async () => {
  const controller = new PublicController({
    getPreviewByToken(token, requestId) {
      assert.equal(token, "preview-token");
      assert.equal(requestId, "request-public-preview-route");

      return Promise.resolve({
        data: { meta: { slug: "home" } },
        meta: { requestId },
      });
    },
  });

  const response = await controller.getPreview(
    "preview-token",
    "request-public-preview-route",
  );

  assert.equal(response.meta.requestId, "request-public-preview-route");
});
