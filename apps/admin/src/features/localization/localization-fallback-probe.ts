const defaultProbeLocale = "de-DE";
const alternateProbeLocale = "fr-FR";

export function readFallbackProbeLocale(defaultLocale: string): string {
  return defaultLocale.trim() === defaultProbeLocale
    ? alternateProbeLocale
    : defaultProbeLocale;
}
