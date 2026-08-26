import { apiErrorCodes } from "@app-starter/schema";
import { readApiFeatureFlags } from "../../common/feature-flags.js";
import { readApiRuntimeDefaults } from "../../common/runtime-defaults.js";

type CommerceReadResource =
  "inventory" | "orders" | "payments" | "prices" | "products" | "variants";

export function createCommerceReadPlaceholder(
  resource: CommerceReadResource,
  requestId: string,
) {
  const defaults = readApiRuntimeDefaults();
  const flags = readApiFeatureFlags();

  return {
    data: [],
    meta: {
      commerceEnabled: flags.commerceEnabled,
      currency: defaults.currency,
      market: defaults.market,
      requestId,
      reservedPhase: "phase-2",
      resource,
      total: 0,
      writeDisabledCode: apiErrorCodes.COMMERCE_DISABLED,
      writable: false,
    },
  };
}
