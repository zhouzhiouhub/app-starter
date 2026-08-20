import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { PagesService } from "../dist/modules/pages/pages.service.js";
import { PublicController } from "../dist/modules/public/public.controller.js";

class PublicPreviewRouteTestModule {}

Module({
  controllers: [PublicController],
  providers: [
    {
      provide: PagesService,
      useValue: {
        getPreviewByToken(token, requestId) {
          return {
            data: { meta: { slug: token } },
            meta: { requestId },
          };
        },
      },
    },
  ],
})(PublicPreviewRouteTestModule);

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

test("public preview route is not cacheable", async () => {
  const app = await NestFactory.create(PublicPreviewRouteTestModule, {
    logger: false,
  });
  app.setGlobalPrefix("api/v1");
  await app.listen(0, "127.0.0.1");

  const address = app.getHttpServer().address();
  const port =
    typeof address === "object" && address !== null ? address.port : 0;

  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/public/preview/home`,
      {
        headers: {
          "x-request-id": "request-public-preview-no-store",
        },
      },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(body.meta.requestId, "request-public-preview-no-store");
  } finally {
    await app.close();
  }
});
