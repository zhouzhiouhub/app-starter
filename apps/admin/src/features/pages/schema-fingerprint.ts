import type { PageSchema } from "@app-starter/schema";

export function createSchemaFingerprint(schema: PageSchema | null): string | null {
  return schema ? JSON.stringify(schema) : null;
}
