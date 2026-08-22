import assert from "node:assert/strict";
import test from "node:test";
import {
  getPageTemplateChrome,
  pageSchema,
} from "../dist/index.js";
import { minimalPage } from "./page-schema-test-helpers.mjs";

test("page schema keeps default chrome for legacy pages", () => {
  const parsed = pageSchema.parse(minimalPage());

  assert.equal(parsed.template.id, "default");
  assert.equal(parsed.chrome.header.enabled, true);
  assert.equal(parsed.chrome.header.variant, "default");
  assert.equal(
    parsed.chrome.header.content.brand.label.defaultValue,
    "App Starter",
  );
  assert.equal(parsed.chrome.header.content.navigation.length, 3);
  assert.equal(parsed.chrome.header.content.navigation[1]?.href, "/en/privacy");
  assert.equal(parsed.chrome.footer.content.navigation[2]?.href, "/en/contact");
  assert.equal(parsed.chrome.header.content.localeSwitcher.enabled, true);
  assert.equal(
    parsed.chrome.header.content.localeSwitcher.locales[0].code,
    "en-US",
  );
  assert.equal(parsed.chrome.footer.enabled, true);
  assert.equal(parsed.chrome.footer.variant, "default");
  assert.equal(parsed.chrome.footer.content.navigation.length, 3);
});

test("page chrome defaults are isolated across parses", () => {
  const first = pageSchema.parse(minimalPage());
  first.chrome.header.content.navigation.push({
    id: "mutated",
    label: { defaultValue: "Mutated" },
    href: "/mutated",
    openInNewTab: false,
  });
  first.chrome.footer.content.brand.label.defaultValue = "Changed";

  const second = pageSchema.parse(minimalPage());

  assert.equal(second.chrome.header.content.navigation.length, 3);
  assert.equal(
    second.chrome.footer.content.brand.label.defaultValue,
    "App Starter",
  );
});

test("landing blank template disables header and footer", () => {
  const chrome = getPageTemplateChrome("landing-blank");

  assert.equal(chrome.header.enabled, false);
  assert.equal(chrome.header.variant, "minimal");
  assert.equal(chrome.header.content.navigation[0].label.defaultValue, "Home");
  assert.equal(chrome.footer.enabled, false);
  assert.equal(chrome.footer.variant, "minimal");
  assert.equal(
    chrome.footer.content.copyright.defaultValue,
    "(c) 2026 App Starter. All rights reserved.",
  );
});

test("page schema accepts per-page chrome overrides", () => {
  const parsed = pageSchema.parse(
    minimalPage({
      template: { id: "policy" },
      chrome: {
        header: { enabled: false },
        footer: { enabled: true, variant: "minimal" },
      },
    }),
  );

  assert.equal(parsed.template.id, "policy");
  assert.equal(parsed.chrome.header.enabled, false);
  assert.equal(parsed.chrome.header.variant, "default");
  assert.equal(
    parsed.chrome.header.content.brand.label.defaultValue,
    "App Starter",
  );
  assert.equal(parsed.chrome.footer.enabled, true);
  assert.equal(parsed.chrome.footer.variant, "minimal");
  assert.equal(parsed.chrome.footer.content.navigation.length, 3);
});

test("page schema rejects unsafe chrome navigation hrefs", () => {
  assert.throws(() =>
    pageSchema.parse(
      minimalPage({
        chrome: {
          header: {
            content: {
              navigation: [
                {
                  id: "bad",
                  label: { defaultValue: "Bad link" },
                  href: "javascript:alert(1)",
                },
              ],
            },
          },
        },
      }),
    ),
  );
});
