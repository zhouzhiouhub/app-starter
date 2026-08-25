import {
  getPublishedPageRevalidationPaths,
  getStorefrontRevalidationCacheTags,
} from "../../packages/schema/dist/index.js";

export function createRevalidationSmokeDetails(revalidation, input) {
  const paths = readStringArray(revalidation?.paths);
  const tags = readStringArray(revalidation?.tags);
  const reason =
    typeof revalidation?.reason === "string" ? revalidation.reason : null;
  const status = Number.isInteger(revalidation?.status)
    ? revalidation.status
    : null;
  const triggered = revalidation?.triggered === true;

  return {
    diagnosis: readRevalidationDiagnosis({
      reason,
      required: Boolean(input.requireRevalidation),
      status,
      triggered,
    }),
    pathCount: paths.length,
    paths,
    reason,
    required: Boolean(input.requireRevalidation),
    status,
    tagCount: tags.length,
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
  const error = new Error(
    [
      "Storefront revalidation did not include the expected page targets",
      `(missing paths: ${formatList(input.missingPaths)},`,
      `missing tags: ${formatList(input.missingTags)},`,
      `diagnosis: ${details.diagnosis}).`,
    ].join(" "),
  );
  error.smokeDetails = {
    revalidation: {
      ...details,
      missingPaths: input.missingPaths,
      missingTags: input.missingTags,
    },
  };

  return error;
}

function readStringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string")
    : [];
}

function formatList(values) {
  return values.length > 0 ? values.join(", ") : "none";
}
