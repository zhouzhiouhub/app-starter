import type { ComponentType } from "react";
import {
  CtaBar,
  Faq,
  HeroBanner,
  ImageGallery,
  RichText,
  SpecTable,
} from "@app-starter/ui";

export type RendererComponent = ComponentType<Record<string, unknown>>;

export type ComponentRegistry = Record<string, RendererComponent>;

export const defaultComponentRegistry: ComponentRegistry = {
  "hero-banner": HeroBanner as RendererComponent,
  "rich-text": RichText as RendererComponent,
  "image-gallery": ImageGallery as RendererComponent,
  "cta-bar": CtaBar as RendererComponent,
  faq: Faq as RendererComponent,
  "spec-table": SpecTable as RendererComponent,
};
