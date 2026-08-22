import type { ReactNode } from "react";
import type { PageSchema } from "@app-starter/schema";
import { PageRenderer, type RenderOptions } from "./page-renderer.js";

const DEFAULT_MOBILE_BREAKPOINT_PX = 768;
const RESPONSIVE_CLASS_NAME = "app-responsive-page-renderer";

export interface ResponsiveRenderOptions extends Omit<RenderOptions, "viewport"> {
  mobileBreakpointPx?: number;
}

export function ResponsivePageRenderer(
  props: { schema: PageSchema } & ResponsiveRenderOptions,
): ReactNode {
  const { mobileBreakpointPx, schema, ...renderOptions } = props;
  const breakpoint = normalizeMobileBreakpoint(mobileBreakpointPx);

  return (
    <>
      <style>{createResponsiveRendererCss(breakpoint)}</style>
      <div
        className={`${RESPONSIVE_CLASS_NAME} ${RESPONSIVE_CLASS_NAME}--desktop`}
        data-renderer-viewport="desktop"
      >
        <PageRenderer {...renderOptions} schema={schema} viewport="desktop" />
      </div>
      <div
        className={`${RESPONSIVE_CLASS_NAME} ${RESPONSIVE_CLASS_NAME}--mobile`}
        data-renderer-viewport="mobile"
      >
        <PageRenderer {...renderOptions} schema={schema} viewport="mobile" />
      </div>
    </>
  );
}

export function createResponsiveRendererCss(mobileBreakpointPx: number): string {
  const breakpoint = normalizeMobileBreakpoint(mobileBreakpointPx);
  const mobileMaxWidth = breakpoint - 1;

  return `
.${RESPONSIVE_CLASS_NAME} {
  display: none;
}

.${RESPONSIVE_CLASS_NAME}--desktop {
  display: block;
}

@media (max-width: ${mobileMaxWidth}px) {
  .${RESPONSIVE_CLASS_NAME}--desktop {
    display: none;
  }

  .${RESPONSIVE_CLASS_NAME}--mobile {
    display: block;
  }
}
`;
}

function normalizeMobileBreakpoint(value?: number): number {
  if (!value) {
    return DEFAULT_MOBILE_BREAKPOINT_PX;
  }

  const breakpoint = Math.floor(value);

  return Number.isFinite(breakpoint) && breakpoint > 1
    ? breakpoint
    : DEFAULT_MOBILE_BREAKPOINT_PX;
}
