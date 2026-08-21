import type { ReactNode } from "react";
import type {
  MediaAssetReference,
  PageChromeRegion,
  SectionNode,
  Viewport,
} from "@app-starter/schema";
import type { ComponentRegistry } from "./component-registry.js";

export interface RenderOptions {
  viewport?: Viewport;
  registry?: ComponentRegistry;
  chrome?: {
    header?: ReactNode | ((region: PageChromeRegion) => ReactNode);
    footer?: ReactNode | ((region: PageChromeRegion) => ReactNode);
  };
  onMissingComponent?: (node: SectionNode) => ReactNode;
  resolveMediaUrl?: (reference: MediaAssetReference) => string;
}

export interface SectionRenderOptions extends RenderOptions {
  verticalOffset?: number;
}
