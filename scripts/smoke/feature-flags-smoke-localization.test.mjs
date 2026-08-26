import assert from "node:assert/strict";
import test from "node:test";
import { assertFeatureFlagsDisabled } from "./feature-flags-smoke.mjs";
import {
  createFeatureFlagSmokeFetch,
  jsonResponse,
} from "./feature-flags-smoke-test-helpers.mjs";
import { withFetch } from "./smoke-test-runtime.mjs";

test("feature flag smoke rejects localization placeholder drift", async () => {
  await withFetch(
    createFeatureFlagSmokeFetch({
      overrides: {
        "/translations?locale=de-DE": () =>
          jsonResponse({
            data: [],
            meta: {
              fallbackLocale: "en-US",
              isFallback: false,
              locale: "de-DE",
            },
          }),
      },
    }),
    async () => {
      await assert.rejects(
        () =>
          assertFeatureFlagsDisabled(
            {
              apiBaseUrl: "https://api.example.com/api/v1",
            },
            "access-token",
          ),
        /Translations placeholder did not fall back to the default locale\./,
      );
    },
  );
});

test("feature flag smoke accepts stored default translation entries", async () => {
  await withFetch(
    createFeatureFlagSmokeFetch({
      overrides: {
        "/translations?locale=de-DE": () =>
          jsonResponse({
            data: [
              {
                key: "page.home.hero.title",
                locale: "en-US",
                value: "Build better storefronts",
              },
            ],
            meta: {
              fallbackLocale: "en-US",
              isFallback: true,
              locale: "en-US",
            },
          }),
      },
    }),
    async () => {
      await assertFeatureFlagsDisabled(
        {
          apiBaseUrl: "https://api.example.com/api/v1",
        },
        "access-token",
      );
    },
  );
});
