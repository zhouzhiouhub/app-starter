export const designTokens = {
  color: {
    primary: "#111827",
    accent: "#2563eb",
    background: "#ffffff",
    foreground: "#111827",
    muted: "#6b7280",
    border: "#e5e7eb"
  },
  radius: {
    sm: "4px",
    md: "8px"
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "32px",
    xl: "64px"
  },
  typography: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
  }
} as const;

export type DesignTokens = typeof designTokens;

export function toCssVariables(tokens: DesignTokens = designTokens): string {
  return [
    `--color-primary:${tokens.color.primary};`,
    `--color-accent:${tokens.color.accent};`,
    `--color-background:${tokens.color.background};`,
    `--color-foreground:${tokens.color.foreground};`,
    `--color-muted:${tokens.color.muted};`,
    `--color-border:${tokens.color.border};`,
    `--radius-sm:${tokens.radius.sm};`,
    `--radius-md:${tokens.radius.md};`,
    `--space-xs:${tokens.spacing.xs};`,
    `--space-sm:${tokens.spacing.sm};`,
    `--space-md:${tokens.spacing.md};`,
    `--space-lg:${tokens.spacing.lg};`,
    `--space-xl:${tokens.spacing.xl};`,
    `--font-family:${tokens.typography.fontFamily};`
  ].join("");
}
