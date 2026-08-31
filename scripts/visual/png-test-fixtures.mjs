import { deflateSync } from "node:zlib";

export const corruptPngBytes = Buffer.concat([
  createPngSignature(),
  Buffer.from([0x00]),
]);

export function createTestPng(width, height) {
  return Buffer.concat([
    createPngSignature(),
    createPngChunk(
      "IHDR",
      Buffer.from([...uint32be(width), ...uint32be(height), 8, 6, 0, 0, 0]),
    ),
    createPngChunk("IDAT", deflateSync(createRawRgbaRows(width, height))),
    createPngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function createRawRgbaRows(width, height) {
  return Buffer.alloc((width * 4 + 1) * height);
}

function createPngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");

  return Buffer.concat([
    Buffer.from(uint32be(data.length)),
    typeBuffer,
    data,
    Buffer.from(uint32be(calculateCrc32(Buffer.concat([typeBuffer, data])))),
  ]);
}

function uint32be(value) {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ];
}

function calculateCrc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createPngSignature() {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});
