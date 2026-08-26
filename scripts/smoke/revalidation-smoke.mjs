import {
  getPublishedPageRevalidationPaths,
  getStorefrontRevalidationCacheTags,
} from "../../packages/schema/dist/index.js";
import { formatSmokeText } from "./smoke-text.mjs";

const maxRevalidationDetailItems = 20;
const maxRevalidationDetailMessageLength = 520;
const maxRevalidationDetailValueLength = 160;

export function createRevalidationSmokeDetails(revalidation, input) {
  const rawPaths = readStringArray(revalidation?.paths);
  const rawTags = readStringArray(revalidation?.tags);
  const rawReason =
    typeof revalidation?.reason === "string" ? revalidation.reason : null;
  const paths = formatRevalidationDetailList(rawPaths);
  const tags = formatRevalidationDetailList(rawTags);
  const reason = formatRevalidationDetailValue(rawReason);
  const status = Number.isInteger(revalidation?.status)
    ? revalidation.status
    : null;
  const triggered = revalidation?.triggered === true;

  return {
    diagnosis: readRevalidationDiagnosis({
      reason: rawReason,
      required: Boolean(input.requireRevalidation),
      status,
      triggered,
    }),
    pathCount: rawPaths.length,
    paths,
    reason,
    required: Boolean(input.requireRevalidation),
    status,
    tagCount: rawTags.length,
    tags,
    triggered,
  };
}

export function assertRevalidationSmokeTargets(revalidation, input) {
  const paths = readStringArray(revalidation?.paths);
  const tags = readStringArray(revalidation?.tags);
  const expectedPaths = getPublishedPageRevalidationPaths(input);
  const expectedTags = getStorefrontRevalidationCacheTags(input);
  const missingPaths = expectedPaths.filter((path) => !paths.includes(path));
  const missingTags = expectedTags.filter((tag) => !tags.includes(tag));

  if (missingPaths.length > 0 || missingTags.length > 0) {
    throw createMissingRevalidationTargetsError({
      input,
      missingPaths,
      missingTags,
      revalidation,
    });
  }
}

function readRevalidationDiagnosis(input) {
  if (input.triggered) {
    return "triggered";
  }

  if (input.reason === "missing-secret") {
    return "missing-secret";
  }

  if (input.reason === "missing-url") {
    return "missing-url";
  }

  if (input.reason === "request-timeout") {
    return "request-timeout";
  }

  if (input.reason === "request-failed") {
    return readFailedRequestDiagnosis(input.status);
  }

  return input.required ? "missing-revalidation-meta" : "not-required";
}

function readFailedRequestDiagnosis(status) {
  if (status >= 300 && status < 400) {
    return "revalidation-redirect";
  }

  if (status === 400) {
    return "invalid-revalidation-payload";
  }

  if (status === 401 || status === 403) {
    return "revalidation-secret-mismatch";
  }

  if (status === 404) {
    return "revalidate-route-missing";
  }

  if (status === 503) {
    return "web-revalidation-not-configured";
  }

  if (status === 500) {
    return "web-revalidation-failed";
  }

  if (status) {
    return "request-failed";
  }

  return "request-failed-or-timeout";
}

function createMissingRevalidationTargetsError(input) {
  const details = createRevalidationSmokeDetails(input.revalidation, input.input);
  const missingPaths = formatRevalidationDetailList(input.missingPaths);
  const missingTags = formatRevalidationDetailList(input.missingTags);
  const error = new Error(
    formatSmokeText(
      [
        "Storefront revalidation did not include the expected page targets",
        `(missing paths: ${formatList(missingPaths)},`,
        `missing tags: ${formatList(missingTags)},`,
        `diagnosis: ${details.diagnosis}).`,
      ].join(" "),
      { maxLength: maxRevalidationDetailMessageLength },
    ),
  );
  error.smokeDetails = {
    revalidation: {
      ...details,
      missingPaths,
      missingTags,
    },
  };

  return error;
}

function readStringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string")
    : [];
}

function formatRevalidationDetailList(values) {
  return values
    .slice(0, maxRevalidationDetailItems)
    .map((value) => formatRevalidationDetailValue(value))
    .filter(Boolean);
}

function formatRevalidationDetailValue(value) {
  return typeof value === "string" && value.length > 0
    ? formatSmokeText(value, { maxLength: maxRevalidationDetailValueLength })
    : null;
}

function formatList(values) {
  return values.length > 0 ? values.join(", ") : "none";
}
