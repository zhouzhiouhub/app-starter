import { createCommerceWebhookVerificationFixture } from "./feature-flags-smoke-commerce-webhook-fixture.mjs";

export function readPublicCommerceDisabledRouteFixture(url, init) {
  if (url.endsWith("/public/cart")) {
    return { action: "add-to-cart", resource: "cart" };
  }

  if (url.endsWith("/public/checkout")) {
    return { action: "checkout", resource: "checkout" };
  }

  return {
    action: "receive-webhook",
    resource: "stripe-webhook",
    webhookVerification: createCommerceWebhookVerificationFixture(init),
  };
}
