import path from "node:path";
import {
  pageBuilderVisualCaptureDefaultHeight,
  pageBuilderVisualCapturePathname,
  pageBuilderVisualCaptureViewportWidths,
} from "./page-builder-visual-capture-constants.mjs";

export function createPageBuilderVisualCaptureJobs(config) {
  const jobs = [];

  for (const component of config.components) {
    for (const viewport of config.viewports) {
      jobs.push(createCaptureJob(config, component, viewport));
    }
  }

  return jobs;
}

export function createPageBuilderVisualCaptureUrl(baseUrl, component, viewport) {
  const url = new URL(pageBuilderVisualCapturePathname, `${baseUrl}/`);
  url.searchParams.set("viewport", viewport);
  url.searchParams.set("component", component);
  return url.toString();
}

function createCaptureJob(config, component, viewport) {
  const evidencePath = `${config.outputDir}/${createScreenshotFileName(
    component,
    viewport,
  )}`;

  return {
    component,
    evidencePath,
    height: pageBuilderVisualCaptureDefaultHeight,
    outputPath: path.resolve(evidencePath),
    url: createPageBuilderVisualCaptureUrl(config.baseUrl, component, viewport),
    viewport,
    width: pageBuilderVisualCaptureViewportWidths[viewport],
  };
}

function createScreenshotFileName(component, viewport) {
  return `page-builder-visual-fixture-${component}-${viewport}.png`;
}
