import assert from "node:assert/strict";
import test from "node:test";
import {
  createRouteRawBodyCapture,
  normalizeRawBodyRoutePath,
  readCapturedRawBody,
  rawBodySymbol,
  stripeWebhookRawBodyRoutePath,
} from "../dist/common/raw-body.js";

test("raw body capture stores a copy for the exact Stripe webhook POST route", () => {
  const capture = createRouteRawBodyCapture(stripeWebhookRawBodyRoutePath);
  const request = {
    method: "POST",
    originalUrl: "/api/v1/webhooks/stripe?delivery=evt_123",
  };
  const payload = Buffer.from('{"id":"evt_secret_payload"}');

  capture(request, {}, payload);

  const captured = readCapturedRawBody(request);

  assert.deepEqual(captured, Buffer.from('{"id":"evt_secret_payload"}'));
  assert.equal(captured === payload, false);
  assert.equal(request[rawBodySymbol], captured);

  payload.fill(0);

  assert.equal(captured?.toString("utf8"), '{"id":"evt_secret_payload"}');
});

test("raw body capture ignores non-webhook routes and non-POST requests", () => {
  const capture = createRouteRawBodyCapture(stripeWebhookRawBodyRoutePath);
  const payload = Buffer.from('{"id":"evt_secret_payload"}');
  const wrongPath = {
    method: "POST",
    originalUrl: "/api/v1/webhooks/stripe/extra",
  };
  const wrongMethod = {
    method: "GET",
    originalUrl: "/api/v1/webhooks/stripe",
  };

  capture(wrongPath, {}, payload);
  capture(wrongMethod, {}, payload);

  assert.equal(readCapturedRawBody(wrongPath), null);
  assert.equal(readCapturedRawBody(wrongMethod), null);
});

test("raw body route normalization is exact after trimming slashes", () => {
  assert.equal(
    normalizeRawBodyRoutePath(" /api/v1/webhooks/stripe/ "),
    stripeWebhookRawBodyRoutePath,
  );
  assert.notEqual(
    normalizeRawBodyRoutePath("/api/v1/webhooks/stripe/extra"),
    stripeWebhookRawBodyRoutePath,
  );
});
