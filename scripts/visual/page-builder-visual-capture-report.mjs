export function formatPageBuilderVisualCaptureReport(result) {
  const lines = [
    "Page Builder visual fixture capture",
    `Base URL: ${result.baseUrl}`,
    `Output: ${result.outputDir}`,
    `Browser: ${result.browserPath}`,
    `Screenshots: ${result.screenshots.length}`,
  ];

  for (const screenshot of result.screenshots) {
    lines.push(
      `  - ${screenshot.component}.${screenshot.viewport}: ${screenshot.evidencePath} (${screenshot.bytes} bytes)`,
    );
  }

  return lines;
}

export function formatPageBuilderVisualCaptureUsage() {
  return [
    "Usage:",
    "  pnpm visual:capture",
    "  pnpm visual:capture -- --base-url http://localhost:3000",
    "  pnpm visual:capture -- --component hero-banner --viewport mobile",
    "",
    "Options:",
    "  --base-url <url>       Web origin with /visual-acceptance enabled.",
    "  --browser <path>       Chrome or Edge executable path.",
    "  --component <id[,id]>  Capture selected MVP component(s).",
    "  --output-dir <dir>     artifacts/visual or reports/visual path.",
    "  --timeout-ms <ms>      Browser screenshot timeout, 1000-120000.",
    "  --viewport <id[,id]>   desktop and/or mobile.",
  ];
}
