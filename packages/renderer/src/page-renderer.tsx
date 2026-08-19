import type { ComponentType, CSSProperties, ReactNode } from "react";
import {
  getOrderedSectionsForViewport,
  getStorefrontHref,
  resolveMediaReferences,
  rewriteStorefrontHref,
  type FooterChromeContent,
  type HeaderChromeContent,
  type MediaAssetReference,
  type PageChromeRegion,
  type PageSchema,
  type SectionNode,
  type Viewport,
} from "@app-starter/schema";
import {
  CtaBar,
  Faq,
  HeroBanner,
  ImageGallery,
  RichText,
  SpecTable,
  StorefrontFooter,
  StorefrontHeader,
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

function renderChromeSlot(
  region: PageChromeRegion,
  slot: ReactNode | ((region: PageChromeRegion) => ReactNode) | undefined,
  fallback: ReactNode,
): ReactNode {
  if (!region.enabled) {
    return null;
  }

  if (typeof slot === "function") {
    return slot(region);
  }

  return slot ?? fallback;
}

function resolveHeaderContent(schema: PageSchema): HeaderChromeContent {
  const content = schema.chrome.header.content;
  const localeSwitcher = content.localeSwitcher;

  return {
    ...content,
    brand: {
      ...content.brand,
      href: rewriteStorefrontHref(content.brand.href),
    },
    navigation: content.navigation.map((item) => ({
      ...item,
      href: rewriteStorefrontHref(item.href),
    })),
    localeSwitcher: {
      ...localeSwitcher,
      locales: localeSwitcher.locales.map((locale) => ({
        ...locale,
        href: rewriteStorefrontHref(
          locale.href ?? getStorefrontHref(locale.code, schema.meta.slug),
        ),
      })),
    },
  };
}

function resolveFooterContent(schema: PageSchema): FooterChromeContent {
  const content = schema.chrome.footer.content;

  return {
    ...content,
    brand: {
      ...content.brand,
      href: rewriteStorefrontHref(content.brand.href),
    },
    navigation: content.navigation.map((item) => ({
      ...item,
      href: rewriteStorefrontHref(item.href),
    })),
  };
}

function createSectionLayoutStyle(
  node: SectionNode,
  viewport: Viewport,
): CSSProperties | undefined {
  const layout = node.layout[viewport];

  if (!layout) {
    return undefined;
  }

  return {
    boxSizing: "border-box",
    gap: layout.gap,
    marginLeft: layout.x > 0 ? layout.x : "auto",
    marginRight: "auto",
    maxWidth: "100%",
    minHeight: layout.height,
    padding: layout.padding,
    width: layout.width,
  };
}

export function renderSection(
  node: SectionNode,
  options: RenderOptions = {},
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

  const componentProps = options.resolveMediaUrl
    ? resolveMediaReferences(node.props, options.resolveMediaUrl)
    : node.props;

  return (
    <div
      data-component={node.component}
      data-section-id={node.id}
      style={createSectionLayoutStyle(node, viewport)}
    >
      <Component {...componentProps} />
    </div>
  );
}

export function PageRenderer(
  props: { schema: PageSchema } & RenderOptions,
): ReactNode {
  const viewport = props.viewport ?? "desktop";
  const sections = getOrderedSectionsForViewport(props.schema, viewport);
  const header = renderChromeSlot(
    props.schema.chrome.header,
    props.chrome?.header,
    <StorefrontHeader
      content={resolveHeaderContent(props.schema)}
      currentLocale={props.schema.meta.locale}
      variant={props.schema.chrome.header.variant}
    />,
  );
  const footer = renderChromeSlot(
    props.schema.chrome.footer,
    props.chrome?.footer,
    <StorefrontFooter
      content={resolveFooterContent(props.schema)}
      variant={props.schema.chrome.footer.variant}
    />,
  );

  return (
    <>
      {header}
      <main
        data-locale={props.schema.meta.locale}
        data-market={props.schema.meta.market}
      >
        {sections.map((section) => (
          <div key={section.id}>
            {renderSection(section, { ...props, viewport })}
          </div>
        ))}
      </main>
      {footer}
    </>
  );
}
