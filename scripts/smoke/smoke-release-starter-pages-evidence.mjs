import { createStarterPagesSmokeDetails } from "./starter-pages-smoke.mjs";

export function readStarterPageEvidenceIssues(details, locale) {
  const expected = createStarterPagesSmokeDetails(locale);
  const publicPages = readStarterPageEvidenceList(details.publicPages);
  const storefrontPages = readStarterPageEvidenceList(details.storefrontPages);

  return [
    ...readStarterPageIssues(publicPages, expected.publicPages, "public API"),
    ...readStarterPageIssues(
      storefrontPages,
      expected.storefrontPages,
      "storefront HTML",
    ),
  ];
}

function readStarterPageEvidenceList(value) {
  return Array.isArray(value) ? value : [];
}

function readStarterPageIssues(actualPages, expectedPages, surface) {
  const actualBySlug = new Map(
    actualPages
      .filter((page) => page && typeof page.slug === "string")
      .map((page) => [page.slug, page]),
  );

  return expectedPages.flatMap((expectedPage) =>
    readSingleStarterPageIssues(actualBySlug.get(expectedPage.slug), {
      expectedPage,
      surface,
    }),
  );
}

function readSingleStarterPageIssues(actualPage, input) {
  if (!actualPage) {
    return [
      `starter-pages.published did not prove seeded ${input.expectedPage.slug} ${input.surface} readiness.`,
    ];
  }

  return [
    readStarterFieldIssue(actualPage, input, "title"),
    readStarterFieldIssue(actualPage, input, "path"),
    readStarterFieldIssue(actualPage, input, "noIndex"),
  ].filter(Boolean);
}

function readStarterFieldIssue(actualPage, input, field) {
  const expectedValue = input.expectedPage[field];

  return actualPage[field] === expectedValue
    ? null
    : `starter-pages.published did not prove seeded ${input.expectedPage.slug} ${input.surface} ${field}=${JSON.stringify(expectedValue)}.`;
}
