export function compareVisualImages(reference, preview, input = {}) {
  const width = Math.max(reference.width, preview.width);
  const height = Math.max(reference.height, preview.height);
  const comparisonPixels = width * height;
  const colorToleranceDeltaE = input.colorToleranceDeltaE ?? 1;
  let changedPixels = 0;
  let maxColorDeltaE = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const referencePixel = readPixel(reference, x, y);
      const previewPixel = readPixel(preview, x, y);

      if (!referencePixel || !previewPixel) {
        changedPixels += 1;
        continue;
      }

      const delta = calculateDeltaE76(
        rgbToLab(compositeOverWhite(referencePixel)),
        rgbToLab(compositeOverWhite(previewPixel)),
      );
      maxColorDeltaE = Math.max(maxColorDeltaE, delta);

      if (delta > colorToleranceDeltaE) {
        changedPixels += 1;
      }
    }
  }

  return {
    changedPixels,
    comparisonPixels,
    dimensions: {
      preview: { height: preview.height, width: preview.width },
      reference: { height: reference.height, width: reference.width },
    },
    maxColorDeltaE: roundMetric(maxColorDeltaE),
    maxLayoutDeltaPx: Math.max(
      Math.abs(reference.width - preview.width),
      Math.abs(reference.height - preview.height),
    ),
    visualMatchPercent: roundMetric(
      ((comparisonPixels - changedPixels) / comparisonPixels) * 100,
    ),
  };
}

export function passesVisualMetricThresholds(metrics, targets) {
  return (
    metrics.visualMatchPercent >= targets.minVisualMatchPercent &&
    metrics.maxLayoutDeltaPx <= targets.maxLayoutDeltaPx &&
    metrics.maxColorDeltaE <= targets.maxColorDeltaE
  );
}

function readPixel(image, x, y) {
  if (x >= image.width || y >= image.height) {
    return null;
  }

  const offset = (y * image.width + x) * 4;
  return [
    image.pixels[offset],
    image.pixels[offset + 1],
    image.pixels[offset + 2],
    image.pixels[offset + 3],
  ];
}

function compositeOverWhite(pixel) {
  const alpha = pixel[3] / 255;

  return [
    Math.round(pixel[0] * alpha + 255 * (1 - alpha)),
    Math.round(pixel[1] * alpha + 255 * (1 - alpha)),
    Math.round(pixel[2] * alpha + 255 * (1 - alpha)),
  ];
}

function rgbToLab(rgb) {
  const [red, green, blue] = rgb.map(rgbChannelToLinear);
  const x = red * 0.4124 + green * 0.3576 + blue * 0.1805;
  const y = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  const z = red * 0.0193 + green * 0.1192 + blue * 0.9505;

  return xyzToLab(x / 0.95047, y, z / 1.08883);
}

function rgbChannelToLinear(value) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function xyzToLab(x, y, z) {
  const fx = labPivot(x);
  const fy = labPivot(y);
  const fz = labPivot(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function labPivot(value) {
  return value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
}

function calculateDeltaE76(first, second) {
  return Math.sqrt(
    (first[0] - second[0]) ** 2 +
      (first[1] - second[1]) ** 2 +
      (first[2] - second[2]) ** 2,
  );
}

function roundMetric(value) {
  return Math.round(value * 100) / 100;
}
