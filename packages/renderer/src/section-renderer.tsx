import type { ReactNode } from "react";
import {
  resolveMediaReferences,
  type SectionNode,
} from "@app-starter/schema";
import { defaultComponentRegistry } from "./component-registry.js";
import type { SectionRenderOptions } from "./renderer-options.js";
import { createSectionLayoutStyle } from "./section-layout.js";

export function renderSection(
  node: SectionNode,
  options: SectionRenderOptions = {},
): ReactNode {
  const registry = options.registry ?? defaultComponentRegistry;
  const Component = registry[node.component];
  const viewport = options.viewport ?? "desktop";

  if (node.visibility?.[viewport] === false) {
    return null;
  }

  const content = Component ? (
    <Component
      {...(options.resolveMediaUrl
        ? resolveMediaReferences(node.props, options.resolveMediaUrl)
        : node.props)}
    />
  ) : (
    options.onMissingComponent?.(node) ?? (
      <section data-component-missing={node.component} data-section-id={node.id}>
        Missing component: {node.component}
      </section>
    )
  );

  return (
    <div
      data-component={node.component}
      data-section-id={node.id}
      style={createSectionLayoutStyle(node, viewport, options.verticalOffset)}
    >
      {content}
    </div>
  );
}
