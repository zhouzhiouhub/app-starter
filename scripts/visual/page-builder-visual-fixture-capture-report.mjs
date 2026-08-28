import { formatPageBuilderVisualCaptureReport } from "./page-builder-visual-capture.mjs";

export function formatPageBuilderVisualFixtureCaptureReport(result) {
  return [
    "Page Builder visual fixture capture workflow",
    `Build: ${result.buildSkipped ? "skipped" : "completed"}`,
    `Web port: ${result.webPort}`,
    ...formatPageBuilderVisualCaptureReport(result).slice(1),
  ];
}

export function formatPageBuilderVisualFixtureCaptureUsage() {
  return [
    "Usage:",
    "  pnpm visual:capture:fixture",
    "  pnpm visual:capture:fixture -- --skip-build",
    "  pnpm visual:capture:fixture -- --component hero-banner --viewport mobile",
    "",
    "Options:",
    "  --skip-build              Reuse the current Web build.",
    "  --start-timeout-ms <ms>   Web fixture startup timeout, 1000-120000.",
    "  --base-url <url>          Local http Web origin, default http://localhost:3000.",
    "  --browser <path>          Chrome or Edge executable path.",
    "  --component <id[,id]>     Capture selected MVP component(s).",
    "  --output-dir <dir>        artifacts/visual or reports/visual path.",
    "  --timeout-ms <ms>         Browser screenshot timeout, 1000-120000.",
    "  --viewport <id[,id]>      desktop and/or mobile.",
  ];
}
