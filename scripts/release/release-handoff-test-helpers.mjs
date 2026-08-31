import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

export function createOutputRoot(label) {
  return `tmp/release-handoff-${label}-${process.pid}-${randomUUID()}`;
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
