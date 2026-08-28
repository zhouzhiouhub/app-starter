import assert from "node:assert/strict";
import test from "node:test";
import {
  apiErrorCodes,
  commerceDisabledReservedPhase,
  commerceDisabledWritable,
  createCommerceDisabledDetails,
} from "../dist/index.js";

test("commerce disabled details expose a stable safe contract", () => {
  assert.deepEqual(
    createCommerceDisabledDetails({
      action: "checkout",
      commerceEnabled: false,
      resource: "checkout",
    }),
    {
      action: "checkout",
      commerceEnabled: false,
      reservedPhase: commerceDisabledReservedPhase,
      resource: "checkout",
      writable: commerceDisabledWritable,
      writeDisabledCode: apiErrorCodes.COMMERCE_DISABLED,
    },
  );
});
