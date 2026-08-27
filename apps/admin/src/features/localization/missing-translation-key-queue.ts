import { translationKeyPattern } from "@app-starter/schema";

export interface MissingTranslationKeyQueueState {
  currentIndex: number;
  currentKey: string | null;
  nextKey: string | null;
  previousKey: string | null;
  totalCount: number;
}

export function readMissingTranslationKeyQueueState(
  keys: string[],
  selectedKey?: string,
  resolvedKeys: string[] = [],
): MissingTranslationKeyQueueState {
  const resolved = new Set(readUniqueValidKeys(resolvedKeys));
  const queue = readUniqueValidKeys(keys).filter((key) => !resolved.has(key));
  const selectedIndex = selectedKey ? queue.indexOf(selectedKey) : -1;
  const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const currentKey = queue[currentIndex] ?? null;

  return {
    currentIndex: currentKey ? currentIndex : -1,
    currentKey,
    nextKey: queue[currentIndex + 1] ?? null,
    previousKey: currentIndex > 0 ? (queue[currentIndex - 1] ?? null) : null,
    totalCount: queue.length,
  };
}

export function mergeResolvedTranslationKeys(
  currentKeys: string[],
  nextKeys: string[],
): string[] {
  return readUniqueValidKeys([...currentKeys, ...nextKeys]);
}

function readUniqueValidKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const queue: string[] = [];

  for (const key of keys) {
    const normalizedKey = key.trim();

    if (!translationKeyPattern.test(normalizedKey) || seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    queue.push(normalizedKey);
  }

  return queue;
}
