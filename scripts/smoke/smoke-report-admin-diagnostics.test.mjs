import assert from "node:assert/strict";
import test from "node:test";
import { readFailureActions } from "./smoke-report-diagnostics.mjs";

test("smoke report actions include Admin modulepreload asset failures", () => {
  const actions = readFailureActions([
    {
      details: {
        adminApp: {
          hasRootElement: true,
          hasModuleScript: true,
          modulePreloadFailures: [
            {
              contentType: "text/html",
              hasJavaScriptContentType: false,
              status: 404,
              statusText: "Not Found",
              url: "https://admin.example.com/assets/vendor.js",
            },
          ],
          modulePreloadUrlIssues: [
            {
              href: "https://cdn.example.com/vendor.js",
              issue: "cross-origin",
            },
          ],
        },
      },
    },
  ]);

  assert.deepEqual(actions, [
    "Serve Admin modulepreload chunks from the same ADMIN_URL origin without credentials, query strings, or fragments.",
    "Check Admin modulepreload chunks are deployed and served with a JavaScript content type.",
  ]);
});

test("smoke report actions include Admin shell entry and stylesheet failures", () => {
  const actions = readFailureActions([
    {
      details: {
        adminApp: {
          hasRootElement: false,
          hasModuleScript: false,
          moduleScriptHasJavaScriptContentType: false,
          moduleScriptOk: false,
          stylesheetFailures: [
            {
              contentType: "text/html",
              hasCssContentType: false,
              status: 404,
              statusText: "Not Found",
              url: "https://admin.example.com/assets/admin.css",
            },
          ],
          stylesheetUrlIssues: [
            {
              href: "https://cdn.example.com/admin.css",
              issue: "cross-origin",
            },
          ],
        },
      },
    },
  ]);

  assert.deepEqual(actions, [
    "Check Admin build output serves the React root HTML at ADMIN_URL.",
    "Serve the Admin module entry script from the same ADMIN_URL origin without credentials, query strings, or fragments.",
    "Check the Admin module entry script is deployed and served with a JavaScript content type.",
    "Serve Admin stylesheets from the same ADMIN_URL origin without credentials, query strings, or fragments.",
    "Check Admin stylesheet assets are deployed and served with a CSS content type.",
  ]);
});
