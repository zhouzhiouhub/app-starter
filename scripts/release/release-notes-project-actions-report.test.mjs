import assert from "node:assert/strict";
import test from "node:test";
import { formatProjectNextActions } from "./release-notes-project-actions-report.mjs";

test("release notes project next actions keep runnable step commands", () => {
  const marker = "release-notes-step-command-end";
  const command = [
    "pnpm visual:references --",
    "--manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    "--output reports/visual/page-builder-fixture/visual-reference-import-report.json",
    "--markdown-output reports/visual/page-builder-fixture/visual-reference-import-report.md",
    "--require-complete",
    marker,
  ].join(" ");
  const lines = formatProjectNextActions(
    {
      nextActionCount: 1,
      nextActions: [
        {
          action: "Import Page Builder visual references.",
          area: "Page Builder Visual",
          label: "Visual acceptance pending",
          steps: [
            {
              label: "Reference report",
              value: command,
            },
          ],
        },
      ],
    },
    {
      releaseReady: false,
    },
  );
  const markdown = lines.join("\n");

  assert.match(markdown, /## Project Next Actions/);
  assert.match(markdown, new RegExp(marker));
  assert.doesNotMatch(markdown, /visual-reference-import-report\.\.\./);
});
