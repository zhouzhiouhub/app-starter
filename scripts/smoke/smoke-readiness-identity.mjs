import {
  appendBlocker,
  appendJwtKeyBlocker,
} from "./smoke-readiness-blockers.mjs";

export function collectIdentityReadiness(blockers, identity) {
  if (identity?.jwt?.productionReady === true) {
    return;
  }

  const jwt = identity?.jwt;

  if (!jwt || typeof jwt !== "object" || Array.isArray(jwt)) {
    appendBlocker(
      blockers,
      "identity.jwt",
      "missing-diagnostics",
      "Collect JWT key diagnostics before production smoke.",
    );
    return;
  }

  appendJwtKeyBlocker(blockers, {
    area: "identity.jwt.private",
    diagnostic: jwt.privateKey,
    variable: "JWT_PRIVATE_KEY",
  });
  appendJwtKeyBlocker(blockers, {
    area: "identity.jwt.public",
    diagnostic: jwt.publicKey,
    variable: "JWT_PUBLIC_KEY",
  });

  if (
    jwt.privateKey?.valid === true &&
    jwt.publicKey?.valid === true &&
    jwt.pair?.valid !== true
  ) {
    appendBlocker(
      blockers,
      "identity.jwt.pair",
      jwt.pair?.issue ?? "invalid-key-pair",
      "JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be a valid matching RS256 key pair.",
    );
  }
}
