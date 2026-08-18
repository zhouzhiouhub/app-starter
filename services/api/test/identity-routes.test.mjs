import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { IdentityController } from "../dist/modules/identity/identity.controller.js";
import { buildLoginGetHint } from "../dist/modules/identity/identity.login-hint.js";
import { IdentityService } from "../dist/modules/identity/identity.service.js";

class LoginRouteTestModule {}

Module({
  controllers: [IdentityController],
  providers: [
    {
      provide: IdentityService,
      useValue: {
        login() {
          return { data: { loggedIn: true } };
        },
      },
    },
  ],
})(LoginRouteTestModule);

test("GET /api/v1/auth/login explains that login is POST-only", () => {
  const hint = buildLoginGetHint();

  assert.equal(hint.data.accepts, "POST");
  assert.equal(hint.data.path, "/api/v1/auth/login");
  assert.equal(hint.data.loginPage, "/login");
});

test("auth login route accepts GET for the hint and POST for login", async () => {
  const app = await NestFactory.create(LoginRouteTestModule, { logger: false });
  app.setGlobalPrefix("api/v1");
  await app.listen(0, "127.0.0.1");

  const address = app.getHttpServer().address();
  const port =
    typeof address === "object" && address !== null ? address.port : 0;

  try {
    const getResponse = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`);
    assert.equal(getResponse.status, 200);
    const getBody = await getResponse.json();
    assert.equal(getBody.data.accepts, "POST");
    assert.equal(getBody.data.loginPage, "/login");

    const postResponse = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
      body: JSON.stringify({ email: "admin@example.com", password: "ChangeMe123!" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    assert.equal(postResponse.ok, true);
    const postBody = await postResponse.json();
    assert.equal(postBody.data.loggedIn, true);
  } finally {
    await app.close();
  }
});
