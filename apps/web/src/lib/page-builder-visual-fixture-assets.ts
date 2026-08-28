export interface PageBuilderVisualFixtureAsset {
  body: string;
  contentType: "image/svg+xml";
}

interface FixtureAssetDefinition {
  accent: string;
  background: string;
  foreground: string;
  label: string;
  title: string;
}

const visualFixtureAssetDefinitions: Readonly<
  Record<string, FixtureAssetDefinition>
> = {
  "visual-gallery-a.svg": {
    accent: "#f97316",
    background: "#fff7ed",
    foreground: "#7c2d12",
    label: "A",
    title: "Gallery fixture image A",
  },
  "visual-gallery-b.svg": {
    accent: "#2563eb",
    background: "#eff6ff",
    foreground: "#172554",
    label: "B",
    title: "Gallery fixture image B",
  },
  "visual-gallery-c.svg": {
    accent: "#16a34a",
    background: "#f0fdf4",
    foreground: "#14532d",
    label: "C",
    title: "Gallery fixture image C",
  },
  "visual-gallery-missing.svg": {
    accent: "#6b7280",
    background: "#f9fafb",
    foreground: "#111827",
    label: "?",
    title: "Missing gallery fixture image",
  },
};

export const pageBuilderVisualFixtureAssetNames = Object.freeze(
  Object.keys(visualFixtureAssetDefinitions),
);

export function readPageBuilderVisualFixtureAsset(
  assetName: string,
): PageBuilderVisualFixtureAsset | null {
  const definition = readFixtureAssetDefinition(assetName);

  if (!definition) {
    return null;
  }

  return {
    body: createFixtureAssetSvg(definition),
    contentType: "image/svg+xml",
  };
}

function readFixtureAssetDefinition(
  assetName: string,
): FixtureAssetDefinition | null {
  return visualFixtureAssetDefinitions[assetName] ?? null;
}

function createFixtureAssetSvg(definition: FixtureAssetDefinition): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="${escapeSvgText(
    definition.title,
  )}">
  <rect width="1200" height="900" fill="${definition.background}"/>
  <path d="M0 700 C 220 600, 360 760, 560 640 S 920 520, 1200 640 L 1200 900 L 0 900 Z" fill="${definition.accent}" opacity="0.22"/>
  <circle cx="880" cy="210" r="150" fill="${definition.accent}" opacity="0.18"/>
  <rect x="96" y="96" width="1008" height="708" rx="36" fill="#ffffff" opacity="0.72"/>
  <rect x="138" y="138" width="924" height="624" rx="28" fill="none" stroke="${definition.accent}" stroke-width="18"/>
  <text x="600" y="424" text-anchor="middle" fill="${definition.foreground}" font-family="Inter, Arial, sans-serif" font-size="112" font-weight="700">${escapeSvgText(
    definition.label,
  )}</text>
  <text x="600" y="514" text-anchor="middle" fill="${definition.foreground}" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="600">${escapeSvgText(
    definition.title,
  )}</text>
</svg>`;
}

function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
