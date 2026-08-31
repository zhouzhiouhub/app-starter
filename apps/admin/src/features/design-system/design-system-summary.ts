import { designTokens, toCssVariables } from "@app-starter/design-tokens";
import { supportedSectionComponentIds } from "../pages/section-components.ts";
import type {
  DesignSystemSummary,
  DesignSystemToken,
  DesignSystemTokenGroup,
} from "./types";

export function readDesignSystemSummary(): DesignSystemSummary {
  const tokenGroups = readTokenGroups();
  const cssVariableNames = readCssVariableNames(toCssVariables());

  return {
    componentCount: supportedSectionComponentIds.length,
    componentIds: [...supportedSectionComponentIds],
    cssVariableCount: cssVariableNames.length,
    cssVariableNames,
    tokenCount: tokenGroups.reduce(
      (total, group) => total + group.tokens.length,
      0,
    ),
    tokenGroups,
  };
}

function readTokenGroups(): DesignSystemTokenGroup[] {
  return [
    {
      key: "color",
      label: "Color",
      tokens: readTokenEntries(designTokens.color),
    },
    {
      key: "radius",
      label: "Radius",
      tokens: readTokenEntries(designTokens.radius),
    },
    {
      key: "spacing",
      label: "Spacing",
      tokens: readTokenEntries(designTokens.spacing),
    },
    {
      key: "typography",
      label: "Typography",
      tokens: readTokenEntries(designTokens.typography),
    },
  ];
}

function readTokenEntries(tokens: Record<string, string>): DesignSystemToken[] {
  return Object.entries(tokens).map(([name, value]) => ({ name, value }));
}

function readCssVariableNames(cssVariables: string): string[] {
  return Array.from(cssVariables.matchAll(/--[a-z-]+(?=:)/g)).map(
    (match) => match[0],
  );
}
