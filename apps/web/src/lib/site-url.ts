export function getWebOrigin(): string {
  const configured =
    process.env.WEB_URL?.trim() ?? process.env.NEXT_PUBLIC_WEB_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}
