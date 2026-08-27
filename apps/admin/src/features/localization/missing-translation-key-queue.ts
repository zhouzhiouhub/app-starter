import { translationKeyPattern } from "@app-starter/schema";

export interface MissingTranslationKeyQueueState {
  currentIndex: number;
  currentKey: string | null;
  keys: string[];
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
    keys: queue,
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

export function syncResolvedTranslationKeysWithMissingKeys(
  resolvedKeys: string[],
  missingKeys: string[],
): string[] {
  const serverMissingKeys = new Set(readUniqueValidKeys(missingKeys));

  return readUniqueValidKeys(resolvedKeys).filter(
    (key) => !serverMissingKeys.has(key),
  );
}

export function readMissingTranslationKeyAdvanceTarget(input: {
  keys: string[];
  resolvedKey: string;
  resolvedKeys?: string[];
  selectedKey?: string | null;
}): string | null {
  const selectedKey = input.selectedKey ?? undefined;
  const currentQueue = readMissingTranslationKeyQueueState(
    input.keys,
    selectedKey,
    input.resolvedKeys,
  ).keys;
  const resolvedKey = input.resolvedKey.trim();
  const resolvedIndex = currentQueue.indexOf(resolvedKey);
  const nextQueue = readMissingTranslationKeyQueueState(
    input.keys,
    selectedKey,
    mergeResolvedTranslationKeys(input.resolvedKeys ?? [], [resolvedKey]),
  ).keys;

  if (nextQueue.length === 0) {
    return null;
  }

  if (resolvedIndex >= 0) {
    return nextQueue[resolvedIndex] ?? nextQueue[0] ?? null;
  }

  return nextQueue.includes(selectedKey ?? "") ? (selectedKey ?? null) : null;
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
