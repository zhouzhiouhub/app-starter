const minimumInspectablePixels = 10_000;
const nearBlackLuma = 24;
const darkLuma = 40;
const brightLuma = 210;
const saturatedDelta = 80;
const saturatedLuma = 50;

export function readPageBuilderVisualReferencePlaceholderIssue(image) {
  const stats = createReferenceImageStats(image);

  if (!stats || !isLikelyGeneratedPlaceholder(stats)) {
    return null;
  }

  return "appears to be a generated placeholder; use the approved design export instead";
}

function isLikelyGeneratedPlaceholder(stats) {
  return (
    stats.pixelCount >= minimumInspectablePixels &&
    stats.nearBlackRatio >= 0.85 &&
    stats.edgeDarkRatio >= 0.96 &&
    stats.topLeftBrightRatio >= 0.01 &&
    stats.centerSaturatedRatio >= 0.05
  );
}

function createReferenceImageStats(image) {
  if (!isReadableImage(image)) {
    return null;
  }

  const counts = createEmptyCounts(image.width * image.height);

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      inspectPixel(counts, image, x, y);
    }
  }

  return {
    centerSaturatedRatio: ratio(counts.centerSaturated, counts.centerPixels),
    edgeDarkRatio: ratio(counts.edgeDark, counts.edgePixels),
    nearBlackRatio: ratio(counts.nearBlack, counts.pixelCount),
    pixelCount: counts.pixelCount,
    topLeftBrightRatio: ratio(counts.topLeftBright, counts.topLeftPixels),
  };
}

function inspectPixel(counts, image, x, y) {
  const pixelOffset = (y * image.width + x) * 4;
  const red = image.pixels[pixelOffset];
  const green = image.pixels[pixelOffset + 1];
  const blue = image.pixels[pixelOffset + 2];
  const luma = (red + green + blue) / 3;

  if (luma < nearBlackLuma) {
    counts.nearBlack += 1;
  }

  if (isEdgePixel(image, x, y)) {
    counts.edgePixels += 1;
    if (luma < darkLuma) {
      counts.edgeDark += 1;
    }
  }

  if (isTopLeftPixel(image, x, y)) {
    counts.topLeftPixels += 1;
    if (luma > brightLuma) {
      counts.topLeftBright += 1;
    }
  }

  if (isCenterPixel(image, x, y)) {
    counts.centerPixels += 1;
    if (isSaturatedPixel(red, green, blue, luma)) {
      counts.centerSaturated += 1;
    }
  }
}

function isReadableImage(image) {
  return (
    image &&
    Number.isFinite(image.width) &&
    Number.isFinite(image.height) &&
    image.width > 0 &&
    image.height > 0 &&
    image.pixels instanceof Uint8Array &&
    image.pixels.length >= image.width * image.height * 4
  );
}

function isEdgePixel(image, x, y) {
  return (
    y < image.height * 0.08 ||
    y >= image.height * 0.92 ||
    x < image.width * 0.08 ||
    x >= image.width * 0.92
  );
}

function isTopLeftPixel(image, x, y) {
  return y < image.height * 0.12 && x < image.width * 0.45;
}

function isCenterPixel(image, x, y) {
  return (
    y > image.height * 0.18 &&
    y < image.height * 0.82 &&
    x > image.width * 0.2 &&
    x < image.width * 0.8
  );
}

function isSaturatedPixel(red, green, blue, luma) {
  const channelDelta = Math.max(red, green, blue) - Math.min(red, green, blue);

  return channelDelta > saturatedDelta && luma > saturatedLuma;
}

function createEmptyCounts(pixelCount) {
  return {
    centerPixels: 0,
    centerSaturated: 0,
    edgeDark: 0,
    edgePixels: 0,
    nearBlack: 0,
    pixelCount,
    topLeftBright: 0,
    topLeftPixels: 0,
  };
}

function ratio(count, total) {
  return total > 0 ? count / total : 0;
}
