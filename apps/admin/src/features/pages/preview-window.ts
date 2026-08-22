const previewWindowTarget = "_blank";
const previewWindowFeatures = "noopener,noreferrer";

export function openStorefrontPreviewWindow(url: string): void {
  const opened = globalThis.open?.(
    url,
    previewWindowTarget,
    previewWindowFeatures,
  );

  if (opened) {
    try {
      opened.opener = null;
    } catch {
      // The noopener feature is the primary guard; this is only a best-effort fallback.
    }
  }
}
