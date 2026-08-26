import { formatSmokeText } from "./smoke-text.mjs";

const maxAdminAppAssetHrefLength = 512;

export function formatAdminAppAssetHref(href) {
  return formatSmokeText(href, {
    maxLength: maxAdminAppAssetHrefLength,
  }) || null;
}
