import path from "node:path";
import { readPngImage } from "./png-image-reader.mjs";

export function readPageBuilderVisualReferencePreviewScreenshot(
  evidence,
  cwd = process.cwd(),
) {
  const previewPath = readPreviewScreenshotPath(evidence);

  if (!previewPath) {
    return null;
  }

  const previewScreenshot = {
    path: previewPath,
  };

  try {
    const image = readPngImage(path.resolve(cwd, previewPath));

    return {
      ...previewScreenshot,
      height: image.height,
      width: image.width,
    };
  } catch (error) {
    return {
      ...previewScreenshot,
      error: readErrorMessage(error),
    };
  }
}

function readPreviewScreenshotPath(evidence) {
  return typeof evidence?.previewScreenshot === "string" &&
    evidence.previewScreenshot.length > 0
    ? evidence.previewScreenshot
    : null;
}

function readErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
