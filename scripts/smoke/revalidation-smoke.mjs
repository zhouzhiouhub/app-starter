export function createRevalidationSmokeDetails(revalidation, input) {
  const paths = readStringArray(revalidation?.paths);
  const tags = readStringArray(revalidation?.tags);
  const reason =
    typeof revalidation?.reason === "string" ? revalidation.reason : null;
  const status =
    Number.isInteger(revalidation?.status) ? revalidation.status : null;
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

  if (input.reason === "request-failed" && input.status) {
    return "request-failed";
  }

  if (input.reason === "request-failed") {
    return "request-failed-or-timeout";
  }

  return input.required ? "missing-revalidation-meta" : "not-required";
}

function readStringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string")
    : [];
}
