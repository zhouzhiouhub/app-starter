import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const pngSignature = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const supportedColorTypes = new Set([2, 6]);

export function readPngImage(filePath) {
  return decodePngImage(readFileSync(filePath), filePath);
}

export function decodePngImage(buffer, label = "PNG image") {
  if (!buffer.subarray(0, pngSignature.length).equals(pngSignature)) {
    throw new Error(`${label} is not a PNG image.`);
  }

  const state = readPngChunks(buffer, label);
  validatePngHeader(state, label);

  const channels = state.colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(state.idatChunks));
  const stride = state.width * channels;
  const expectedRawLength = (stride + 1) * state.height;
  const pixels = new Uint8Array(state.width * state.height * 4);
  let rawOffset = 0;
  let pixelOffset = 0;
  let previous = Buffer.alloc(stride);

  if (raw.length < expectedRawLength) {
    throw new Error(`${label} has incomplete PNG image data.`);
  }

  for (let y = 0; y < state.height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const current = Buffer.from(raw.subarray(rawOffset, rawOffset + stride));
    rawOffset += stride;
    unfilterPngScanline(current, previous, filter, channels);
    pixelOffset = copyScanlineToRgba(current, pixels, pixelOffset, channels);
    previous = current;
  }

  return {
    height: state.height,
    pixels,
    width: state.width,
  };
}

function readPngChunks(buffer, label) {
  const state = {
    bitDepth: null,
    colorType: null,
    height: null,
    idatChunks: [],
    interlaceMethod: null,
    width: null,
  };
  let offset = pngSignature.length;

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const data = buffer.subarray(dataStart, dataEnd);

    if (type === "IHDR") {
      readPngHeader(data, state);
    } else if (type === "IDAT") {
      state.idatChunks.push(data);
    } else if (type === "IEND") {
      return state;
    }

    offset = dataEnd + 4;
  }

  throw new Error(`${label} is missing an IEND chunk.`);
}

function readPngHeader(data, state) {
  state.width = data.readUInt32BE(0);
  state.height = data.readUInt32BE(4);
  state.bitDepth = data[8];
  state.colorType = data[9];
  state.interlaceMethod = data[12];
}

function validatePngHeader(state, label) {
  if (!state.width || !state.height) {
    throw new Error(`${label} is missing a valid PNG header.`);
  }

  if (state.bitDepth !== 8 || !supportedColorTypes.has(state.colorType)) {
    throw new Error(`${label} must be an 8-bit RGB or RGBA PNG.`);
  }

  if (state.interlaceMethod !== 0) {
    throw new Error(`${label} must be a non-interlaced PNG.`);
  }

  if (state.idatChunks.length === 0) {
    throw new Error(`${label} is missing image data.`);
  }
}

function unfilterPngScanline(current, previous, filter, bytesPerPixel) {
  switch (filter) {
    case 0:
      return;
    case 1:
      unfilterSub(current, bytesPerPixel);
      return;
    case 2:
      unfilterUp(current, previous);
      return;
    case 3:
      unfilterAverage(current, previous, bytesPerPixel);
      return;
    case 4:
      unfilterPaeth(current, previous, bytesPerPixel);
      return;
    default:
      throw new Error(`Unsupported PNG filter type: ${filter}.`);
  }
}

function unfilterSub(current, bytesPerPixel) {
  for (let index = bytesPerPixel; index < current.length; index += 1) {
    current[index] = (current[index] + current[index - bytesPerPixel]) & 0xff;
  }
}

function unfilterUp(current, previous) {
  for (let index = 0; index < current.length; index += 1) {
    current[index] = (current[index] + previous[index]) & 0xff;
  }
}

function unfilterAverage(current, previous, bytesPerPixel) {
  for (let index = 0; index < current.length; index += 1) {
    const left = index >= bytesPerPixel ? current[index - bytesPerPixel] : 0;
    const up = previous[index];
    current[index] = (current[index] + Math.floor((left + up) / 2)) & 0xff;
  }
}

function unfilterPaeth(current, previous, bytesPerPixel) {
  for (let index = 0; index < current.length; index += 1) {
    const left = index >= bytesPerPixel ? current[index - bytesPerPixel] : 0;
    const up = previous[index];
    const upLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;
    current[index] = (current[index] + paethPredictor(left, up, upLeft)) & 0xff;
  }
}

function paethPredictor(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  return upDistance <= upLeftDistance ? up : upLeft;
}

function copyScanlineToRgba(current, pixels, pixelOffset, channels) {
  for (let index = 0; index < current.length; index += channels) {
    pixels[pixelOffset] = current[index];
    pixels[pixelOffset + 1] = current[index + 1];
    pixels[pixelOffset + 2] = current[index + 2];
    pixels[pixelOffset + 3] = channels === 4 ? current[index + 3] : 255;
    pixelOffset += 4;
  }

  return pixelOffset;
}
