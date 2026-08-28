export const pageBuilderVisualAcceptanceSchemaVersion =
  "page-builder-visual-acceptance.v1";
export const defaultPageBuilderVisualAcceptanceManifestPath =
  "docs/development/page-builder-visual-acceptance.json";
export const mvpPageBuilderComponents = [
  "hero-banner",
  "rich-text",
  "image-gallery",
  "cta-bar",
  "faq",
  "spec-table",
];
export const pageBuilderVisualAcceptanceViewports = ["desktop", "mobile"];
export const pageBuilderVisualAcceptanceStatuses = new Set([
  "accepted",
  "blocked",
  "needs-evidence",
]);
export const defaultPageBuilderVisualAcceptanceTargets = {
  maxColorDeltaE: 3,
  maxLayoutDeltaPx: 5,
  minVisualMatchPercent: 95,
};
