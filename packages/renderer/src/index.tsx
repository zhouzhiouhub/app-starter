import type { ComponentType, ReactNode } from "react";
import type { PageSchema, SectionNode, Viewport } from "@app-starter/schema";
import {
  CtaBar,
  Faq,
  HeroBanner,
  ImageGallery,
  RichText,
  SpecTable
} from "@app-starter/ui";

export type RendererComponent = ComponentType<Record<string, unknown>>;

export type ComponentRegistry = Record<string, RendererComponent>;

export const defaultComponentRegistry: ComponentRegistry = {
  "hero-banner": HeroBanner as RendererComponent,
  "rich-text": RichText as RendererComponent,
  "image-gallery": ImageGallery as RendererComponent,
  "cta-bar": CtaBar as RendererComponent,
  faq: Faq as RendererComponent,
  "spec-table": SpecTable as RendererComponent
};

export interface RenderOptions {
  viewport?: Viewport;
  registry?: ComponentRegistry;
  onMissingComponent?: (node: SectionNode) => ReactNode;
}

export function renderSection(
  node: SectionNode,
  options: RenderOptions = {}
): ReactNode {
  const registry = options.registry ?? defaultComponentRegistry;
  const Component = registry[node.component];
  const viewport = options.viewport ?? "desktop";

  if (node.visibility?.[viewport] === false) {
    return null;
  }

  if (!Component) {
    return options.onMissingComponent ? (
      options.onMissingComponent(node)
    ) : (
      <section data-component-missing={node.component} data-section-id={node.id}>
        Missing component: {node.component}
      </section>
    );
  }

  return (
    <div data-component={node.component} data-section-id={node.id}>
      <Component {...node.props} />
    </div>
  );
}

export function PageRenderer(
  props: { schema: PageSchema } & RenderOptions
): ReactNode {
  return (
    <main data-locale={props.schema.meta.locale} data-market={props.schema.meta.market}>
      {props.schema.sections.map((section) => (
        <div key={section.id}>{renderSection(section, props)}</div>
      ))}
    </main>
  );
}
