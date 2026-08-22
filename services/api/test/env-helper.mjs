export function withEnv(values, fn) {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );

  for (const [key, value] of Object.entries(values)) {
    setEnvValue(key, value);
  }

  try {
    const result = fn();

    if (result && typeof result.finally === "function") {
      return result.finally(() => restoreEnv(previous));
    }

    restoreEnv(previous);
    return result;
  } catch (error) {
    restoreEnv(previous);
    throw error;
  }
}

function restoreEnv(previous) {
  for (const [key, value] of Object.entries(previous)) {
    setEnvValue(key, value);
  }
}

function setEnvValue(key, value) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
