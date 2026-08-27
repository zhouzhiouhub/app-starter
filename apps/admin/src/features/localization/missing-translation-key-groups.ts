export interface MissingTranslationKeyGroup {
  keys: string[];
  namespace: string;
}

export function groupMissingTranslationKeys(
  keys: string[],
): MissingTranslationKeyGroup[] {
  const groups = new Map<string, MissingTranslationKeyGroup>();
  const seen = new Set<string>();

  keys.forEach((key) => {
    const normalizedKey = key.trim();

    if (!normalizedKey || seen.has(normalizedKey)) {
      return;
    }

    seen.add(normalizedKey);
    const namespace = readMissingKeyNamespace(normalizedKey);
    const group = groups.get(namespace);

    if (group) {
      group.keys.push(normalizedKey);
      return;
    }

    groups.set(namespace, { keys: [normalizedKey], namespace });
  });

  return [...groups.values()];
}

function readMissingKeyNamespace(key: string): string {
  const segments = key.split(".").filter(Boolean);

  if (segments.length >= 2) {
    return `${segments[0]}.${segments[1]}`;
  }

  return segments[0] ?? key;
}
