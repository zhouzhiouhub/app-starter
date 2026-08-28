const publicApiFailureActions = new Map([
  [
    "fallback-mismatch",
    "Check public page API fallback metadata for non-default locale requests.",
  ],
  [
    "locale-mismatch",
    "Check public page API locale metadata and DEFAULT_LOCALE / MULTI_LOCALE_ENABLED settings.",
  ],
  [
    "noindex-page",
    "Clear SEO noIndex on the smoke page before publishing.",
  ],
  [
    "noindex-mismatch",
    "Check the published page SEO noIndex value matches the page type: marketing and policy pages should be indexable, while the 404 system page should be noIndex.",
  ],
  [
    "title-mismatch",
    "Check that publish wrote the expected PageVersion and the public page API reads the current published slug.",
  ],
]);

export function readPublicApiFailureActions(details) {
  const diagnosis = readPublicApiDiagnosis(details);
  const action = diagnosis ? publicApiFailureActions.get(diagnosis) : undefined;

  return action ? [action] : [];
}

export function readPublicApiDiagnosis(details) {
  const publicApi = readPlainRecord(details.publicApi);
  return typeof publicApi.diagnosis === "string" &&
    publicApi.diagnosis.length > 0
    ? publicApi.diagnosis
    : null;
}

function readPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
