import assert from "node:assert/strict";
import test from "node:test";
import {
  apiRequestBodyLimit,
  configureApiApplication,
} from "../dist/common/api-application.js";
import { readCapturedRawBody } from "../dist/common/raw-body.js";

test("API bootstrap wires JSON raw body capture for the Stripe webhook route", () => {
  const bodyParserCalls = [];
  const app = {
    enableCors() {},
    setGlobalPrefix(prefix) {
      assert.equal(prefix, "api/v1");
    },
    use() {},
    useBodyParser(type, options) {
      bodyParserCalls.push({ options, type });
    },
    useGlobalFilters() {},
    useGlobalPipes() {},
  };

  configureApiApplication(app);

  const jsonCall = bodyParserCalls.find((call) => call.type === "json");
  const urlencodedCall = bodyParserCalls.find(
    (call) => call.type === "urlencoded",
  );

  assert.equal(jsonCall?.options.limit, apiRequestBodyLimit);
  assert.equal(typeof jsonCall?.options.verify, "function");
  assert.equal(urlencodedCall?.options.limit, apiRequestBodyLimit);
  assert.equal(urlencodedCall?.options.verify, undefined);

  const webhookRequest = {
    method: "POST",
    originalUrl: "/api/v1/webhooks/stripe",
  };
  const loginRequest = {
    method: "POST",
    originalUrl: "/api/v1/auth/login",
  };
  const payload = Buffer.from('{"id":"evt_secret_payload"}');

  jsonCall.options.verify(webhookRequest, {}, payload);
  jsonCall.options.verify(loginRequest, {}, payload);

  assert.deepEqual(readCapturedRawBody(webhookRequest), payload);
  assert.equal(readCapturedRawBody(loginRequest), null);
});
