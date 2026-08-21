export function createPreviewDiagnostics(env = process.env) {
  const secretConfigured = Boolean(readEnv(env, "PREVIEW_TOKEN_SECRET"));

  return {
    configured: secretConfigured,
    previousSecretConfigured: Boolean(
      readEnv(env, "PREVIEW_TOKEN_PREVIOUS_SECRET"),
    ),
    secretConfigured,
  };
}

function readEnv(env, name) {
  const value = env[name]?.trim();
  return value ? value : null;
}
