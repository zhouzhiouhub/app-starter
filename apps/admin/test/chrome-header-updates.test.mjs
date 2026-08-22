import assert from "node:assert/strict";
import test from "node:test";
import { exampleLandingPage } from "@app-starter/schema";
import { updateHeaderLocaleOption } from "../src/features/pages/chrome-header-updates.ts";

test("header locale option empty href removes the optional link", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.chrome.header.content.localeSwitcher.locales[0] = {
    code: "fr-FR",
    href: "/fr",
    label: { defaultValue: "French" },
  };

  const updated = updateHeaderLocaleOption(schema, 0, "href", "   ");

  assert.deepEqual(updated.chrome.header.content.localeSwitcher.locales[0], {
    code: "fr-FR",
    label: { defaultValue: "French" },
  });
  assert.equal(
    schema.chrome.header.content.localeSwitcher.locales[0].href,
    "/fr",
  );
});
