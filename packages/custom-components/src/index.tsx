import type { ComponentType } from "react";

export interface CustomComponentDefinition {
  slug: string;
  name: string;
  type: "section" | "block";
  schemaVersion: string;
  component: ComponentType<Record<string, unknown>>;
}

export const customComponents: CustomComponentDefinition[] = [];
