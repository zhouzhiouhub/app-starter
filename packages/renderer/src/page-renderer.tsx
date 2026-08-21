import type { ReactNode } from "react";
import {
  getOrderedSectionsForViewport,
  type PageSchema,
} from "@app-starter/schema";
import { StorefrontFooter, StorefrontHeader } from "@app-starter/ui";
import {
  renderChromeSlot,
  resolveFooterContent,
  resolveHeaderContent,
} from "./page-chrome.js";
import type { RenderOptions } from "./renderer-options.js";
import { createSectionVerticalOffsets } from "./section-layout.js";
import { renderSection } from "./section-renderer.js";

export type {
  ComponentRegistry,
  RendererComponent,
} from "./component-registry.js";
export { defaultComponentRegistry } from "./component-registry.js";
export type { RenderOptions } from "./renderer-options.js";
export { renderSection } from "./section-renderer.js";

export function PageRenderer(
  props: { schema: PageSchema } & RenderOptions,
): ReactNode {
  const viewport = props.viewport ?? "desktop";
  const sections = getOrderedSectionsForViewport(props.schema, viewport);
  const verticalOffsets = createSectionVerticalOffsets(sections, viewport);
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
            {renderSection(section, {
              ...props,
              verticalOffset: verticalOffsets.get(section.id),
              viewport,
            })}
          </div>
        ))}
      </main>
      {footer}
    </>
  );
}
