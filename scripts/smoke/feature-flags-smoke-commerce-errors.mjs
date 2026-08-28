import {
  apiErrorCodes,
  createCommerceDisabledDetails,
  createCommerceReservedDetailDetails,
} from "../../packages/schema/dist/index.js";
import { readApiErrorCode } from "./feature-flags-smoke-disabled-endpoint.mjs";
import { fetchJson } from "./http-json-smoke.mjs";

export async function assertCommerceDisabledErrorResponse(
  url,
  init,
  expectedDetails,
) {
  const response = await fetchJson(url, init);
  const code = readApiErrorCode(response.body);

  if (response.status !== 409 || code !== apiErrorCodes.COMMERCE_DISABLED) {
    throw new Error(
      `${url} expected 409 ${apiErrorCodes.COMMERCE_DISABLED}, got ${formatCommerceDiagnostic(
        response,
        code,
      )}.`,
    );
  }

  assertCommerceDetails({
    actual: readCommerceDetails(response.body),
    expected: createCommerceDisabledDetails({
      ...expectedDetails,
      commerceEnabled: false,
    }),
    label: "Commerce disabled details",
    url,
  });
}

export async function assertCommerceReservedDetailResponse(
  url,
  init,
  expectedDetails,
  placeholderIdentifier,
) {
  const response = await fetchJson(url, init);
  const code = readApiErrorCode(response.body);

  if (response.status !== 404 || code !== apiErrorCodes.NOT_FOUND) {
    throw new Error(
      `${url} expected 404 ${apiErrorCodes.NOT_FOUND}, got ${formatCommerceDiagnostic(
        response,
        code,
      )}.`,
    );
  }

  if (
    placeholderIdentifier &&
    JSON.stringify(response.body ?? {}).includes(placeholderIdentifier)
  ) {
    throw new Error(`${url} leaked the placeholder identifier.`);
  }

  assertCommerceDetails({
    actual: readCommerceDetails(response.body),
    expected: createCommerceReservedDetailDetails({
      ...expectedDetails,
      commerceEnabled: false,
    }),
    label: "Commerce reserved details",
    url,
  });
}

function assertCommerceDetails({ actual, expected, label, url }) {
  const fieldLabel = label.endsWith("details") ? label.slice(0, -1) : label;

  if (!actual || typeof actual !== "object" || Array.isArray(actual)) {
    throw new Error(`${url} did not expose ${label}.`);
  }

  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();

  if (actualKeys.join(",") !== expectedKeys.join(",")) {
    throw new Error(`${url} exposed unexpected ${fieldLabel} keys.`);
  }

  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) {
      throw new Error(
        `${url} ${fieldLabel}.${key} did not match the MVP reserved contract.`,
      );
    }
  }
}

function formatCommerceDiagnostic(response, code) {
  const statusText = response.statusText ? ` ${response.statusText}` : "";
  const redirect = response.redirectLocation
    ? ` redirect: ${response.redirectLocation}`
    : "";

  return `${response.status}${statusText} ${code ?? "NO_CODE"}${redirect}`;
}

function readCommerceDetails(body) {
  return body?.error?.details ?? body?.details ?? null;
}
