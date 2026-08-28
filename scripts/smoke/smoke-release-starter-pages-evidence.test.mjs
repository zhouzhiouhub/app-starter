import assert from "node:assert/strict";
import test from "node:test";
import { readStarterPageEvidenceIssues } from "./smoke-release-starter-pages-evidence.mjs";
import { createStarterPagesSmokeDetails } from "./starter-pages-smoke.mjs";

test("starter page release evidence accepts complete details", () => {
  assert.deepEqual(
    readStarterPageEvidenceIssues(createStarterPagesSmokeDetails("en-US"), "en-US"),
    [],
  );
});

test("starter page release evidence rejects missing and drifted details", () => {
  const details = createStarterPagesSmokeDetails("en-US");
  const privacyPage = details.publicPages.find((page) => page.slug === "privacy");
  const termsPage = details.storefrontPages.find((page) => page.slug === "terms");
  const notFoundPage = details.publicPages.find((page) => page.slug === "404");

  privacyPage.title = "Privacy";
  termsPage.path = "/en/legal/terms";
  notFoundPage.noIndex = false;
  details.publicPages = details.publicPages.filter((page) => page.slug !== "home");

  assert.deepEqual(readStarterPageEvidenceIssues(details, "en-US"), [
    "starter-pages.published did not prove seeded home public API readiness.",
    'starter-pages.published did not prove seeded privacy public API title="Privacy Policy".',
    "starter-pages.published did not prove seeded 404 public API noIndex=true.",
    'starter-pages.published did not prove seeded terms storefront HTML path="/en/terms".',
  ]);
});
