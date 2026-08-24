const minPreviewTokenSecretLength = 32;
const maxPreviewTokenSecretLength = 1024;

export function createPreviewDiagnostics(env = process.env) {
  const secret = readPreviewSecret(env, "PREVIEW_TOKEN_SECRET");
  const previousSecret = readPreviewSecret(env, "PREVIEW_TOKEN_PREVIOUS_SECRET");

  return {
    configured: secret.safe,
    previousSecretConfigured: previousSecret.configured,
    previousSecretIssue: previousSecret.configured ? previousSecret.issue : null,
    previousSecretSafe: previousSecret.configured ? previousSecret.safe : true,
    secretConfigured: secret.configured,
    secretIssue: secret.issue,
    secretSafe: secret.safe,
  };
}

function readPreviewSecret(env, name) {
  const value = readEnv(env, name);

  if (!value) {
    return {
      configured: false,
      issue: "missing-secret",
      safe: false,
    };
  }

  if (value.length < minPreviewTokenSecretLength) {
    return {
      configured: true,
      issue: "short-secret",
      safe: false,
    };
  }

  if (value.length > maxPreviewTokenSecretLength) {
    return {
      configured: true,
      issue: "oversized-secret",
      safe: false,
    };
  }

  if (hasControlCharacter(value)) {
    return {
      configured: true,
      issue: "control-character",
      safe: false,
    };
  }

  return {
    configured: true,
    issue: null,
    safe: true,
  };
}

function readEnv(env, name) {
  const value = env[name]?.trim();
  return value ? value : null;
}

function hasControlCharacter(value) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
