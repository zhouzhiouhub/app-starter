const previewWindowTarget = "_blank";
const previewWindowFeatures = "noopener,noreferrer";

export function openStorefrontPreviewWindow(url: string): void {
  if (!isSafePreviewWindowUrl(url)) {
    return;
  }

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

function isSafePreviewWindowUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password &&
      !url.hash
    );
  } catch {
    return false;
  }
}
