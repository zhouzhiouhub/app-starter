const defaultAcceptPassingCommand =
  "pnpm visual:measure -- --write --accept-passing --require-complete";
const defaultMeasureCommand = "pnpm visual:measure -- --write --require-complete";
const defaultVerifyCommand = "pnpm visual:acceptance -- --require-accepted";

export function formatPageBuilderVisualAcceptanceChecklist(checklist) {
  const lines = [
    "Evidence checklist:",
    `  Viewports ready: ${checklist.readyViewportCount}/${checklist.viewportCount}`,
  ];

  for (const component of checklist.components) {
    lines.push(`  - ${component.component}: ${component.status}`);

    for (const viewport of component.viewports) {
      lines.push(...formatViewportChecklist(viewport));
    }
  }

  if (checklist.pendingViewportCount > 0) {
    const measureCommand =
      readFirstPendingViewportCommand(checklist, "measure") ??
      defaultMeasureCommand;
    const acceptPassingCommand =
      readFirstPendingViewportCommand(checklist, "acceptPassing") ??
      defaultAcceptPassingCommand;
    const verifyCommand =
      readFirstPendingViewportCommand(checklist, "verify") ??
      defaultVerifyCommand;

    lines.push(
      `Next: attach missing design references, run \`${measureCommand}\`, review measured diff values, run \`${acceptPassingCommand}\`, then verify with \`${verifyCommand}\`.`,
    );
  }

  return lines;
}

function readFirstPendingViewportCommand(checklist, command) {
  return (
    checklist.components
      ?.flatMap((component) => component.viewports ?? [])
      .find((viewport) => viewport.ready !== true && viewport.commands?.[command])
      ?.commands?.[command] ?? null
  );
}

function formatViewportChecklist(viewport) {
  const label = `    ${viewport.component}.${viewport.viewport}`;

  if (viewport.ready) {
    return [`${label}: ready`];
  }

  return [
    `${label}: missing ${viewport.missing.join(", ")}`,
    `      expected designReference: ${viewport.expectedDesignReference}`,
    `      expected previewScreenshot: ${viewport.expectedPreviewScreenshot}`,
    `      reference report: ${viewport.commands.referenceReport}`,
    `      import reference: ${viewport.commands.importReference}`,
    `      capture preview: ${viewport.commands.capture}`,
    `      measure evidence: ${viewport.commands.measure}`,
    `      accept passing: ${viewport.commands.acceptPassing}`,
    `      verify accepted: ${viewport.commands.verify}`,
  ];
}
