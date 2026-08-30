import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("release check docs mention visual artifact text summary counts", async () => {
  const [readme, setupDoc, releaseChecklist] = await Promise.all([
    readFile("README.md", "utf8"),
    readFile("docs/development/setup.md", "utf8"),
    readFile("docs/development/release-checklist.md", "utf8"),
  ]);

  assert.match(
    readme,
    /普通文本摘要和 `readinessChecklist` 视觉条目都会显示 visual artifact 路径、文件\/截图计数/,
  );
  assert.match(
    setupDoc,
    /prints the artifact path plus issue, file, and\s+screenshot counts in the text summary/s,
  );
  assert.match(
    setupDoc,
    /readinessChecklist` with the same release tasks, visual artifact path, issue,\s+and count details/s,
  );
  assert.match(
    releaseChecklist,
    /prints the visual artifact path plus issue, file, and\s+screenshot counts/s,
  );
  assert.match(
    releaseChecklist,
    /readinessChecklist` lists the\s+Production Smoke, Page Builder visual, and release notes tasks, including the\s+visual artifact path, issue count, and counts/s,
  );
});
