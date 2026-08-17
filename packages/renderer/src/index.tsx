import type { ComponentType, ReactNode } from "react";
import type {
  PageChromeRegion,
  PageSchema,
  SectionNode,
  Viewport
} from "@app-starter/schema";
import {
  CtaBar,
  Faq,
  HeroBanner,
  ImageGallery,
  RichText,
  SpecTable,
  StorefrontFooter,
  StorefrontHeader
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
  chrome?: {
    header?: ReactNode | ((region: PageChromeRegion) => ReactNode);
    footer?: ReactNode | ((region: PageChromeRegion) => ReactNode);
  };
  onMissingComponent?: (node: SectionNode) => ReactNode;
}

function renderChromeSlot(
  region: PageChromeRegion,
  slot: ReactNode | ((region: PageChromeRegion) => ReactNode) | undefined,
  fallback: ReactNode
): ReactNode {
  if (!region.enabled) {
    return null;
  }

  if (typeof slot === "function") {
    return slot(region);
  }

  return slot ?? fallback;
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
  const header = renderChromeSlot(
    props.schema.chrome.header,
    props.chrome?.header,
    <StorefrontHeader
      content={props.schema.chrome.header.content}
      variant={props.schema.chrome.header.variant}
    />
  );
  const footer = renderChromeSlot(
    props.schema.chrome.footer,
    props.chrome?.footer,
    <StorefrontFooter
      content={props.schema.chrome.footer.content}
      variant={props.schema.chrome.footer.variant}
    />
  );

  return (
    <>
      {header}
      <main data-locale={props.schema.meta.locale} data-market={props.schema.meta.market}>
        {props.schema.sections.map((section) => (
          <div key={section.id}>{renderSection(section, props)}</div>
        ))}
      </main>
      {footer}
    </>
  );
}
