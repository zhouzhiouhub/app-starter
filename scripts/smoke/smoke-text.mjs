import { redactSmokeSecrets } from "./smoke-secrets.mjs";

export function formatSmokeText(
  value,
  { fallback = "", maxLength = null } = {},
) {
  const source =
    value === undefined || value === null || value === "" ? fallback : value;
  const normalized = normalizeSmokeText(redactSmokeSecrets(source));

  return typeof maxLength === "number"
    ? truncateSmokeText(normalized, maxLength)
    : normalized;
}

export function normalizeSmokeText(value) {
  return replaceControlCharacters(value).replace(/\s+/g, " ").trim();
}

export function truncateSmokeText(value, limit) {
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function replaceControlCharacters(value) {
  let result = "";

  for (const character of String(value)) {
    const code = character.charCodeAt(0);
    result += code <= 31 || code === 127 ? " " : character;
  }

  return result;
}
