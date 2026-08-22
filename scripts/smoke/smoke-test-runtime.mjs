export async function withFetch(fetchImplementation, fn) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImplementation;

  try {
    await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

export async function withFetchAndNow(fetchImplementation, now, fn) {
  const originalNow = Date.now;

  Date.now = now;

  try {
    await withFetch(fetchImplementation, fn);
  } finally {
    Date.now = originalNow;
  }
}
