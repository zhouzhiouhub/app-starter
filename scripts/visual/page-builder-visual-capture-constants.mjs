export {
  mvpPageBuilderComponents as pageBuilderVisualCaptureComponents,
  pageBuilderVisualAcceptanceViewports as pageBuilderVisualCaptureViewports,
} from "./page-builder-visual-acceptance-constants.mjs";

export const pageBuilderVisualCaptureDefaultBaseUrl = "http://localhost:3000";
export const pageBuilderVisualCaptureDefaultHeight = 1000;
export const pageBuilderVisualCaptureDefaultOutputDir = "artifacts/visual";
export const pageBuilderVisualCaptureDefaultTimeoutMs = 30000;
export const pageBuilderVisualCapturePathname = "/visual-acceptance";

export const pageBuilderVisualCaptureViewportWidths = {
  desktop: 1440,
  mobile: 390,
};
