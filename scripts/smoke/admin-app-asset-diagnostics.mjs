import { formatSmokeText } from "./smoke-text.mjs";

const maxAdminAppAssetHrefLength = 512;
const maxAdminAppAssetUrlLength = 512;

export function formatAdminAppAssetHref(href) {
  return formatSmokeText(href, {
    maxLength: maxAdminAppAssetHrefLength,
  }) || null;
}

export function formatAdminAppAssetUrl(url) {
  return formatSmokeText(url, {
    maxLength: maxAdminAppAssetUrlLength,
  }) || null;
}
