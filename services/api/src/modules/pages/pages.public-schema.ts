import type { PageSchema } from "@app-starter/schema";
import type { Prisma } from "@prisma/client";
import { readSchema } from "./pages.validation.js";

export function readPublicPageSchemaSafely(
  value: Prisma.JsonValue,
  slug: string,
): PageSchema | null {
  try {
    return readSchema(value, slug);
  } catch {
    return null;
  }
}
