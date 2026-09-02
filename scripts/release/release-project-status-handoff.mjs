export const defaultReleaseProjectStatusOutputPath =
  "artifacts/release/project-status.json";
export const defaultReleaseProjectStatusMarkdownPath =
  "artifacts/release/project-status.md";

const defaultProjectStatusHandoff = {
  jsonPath: defaultReleaseProjectStatusOutputPath,
  markdownPath: defaultReleaseProjectStatusMarkdownPath,
  shortcut: "pnpm run verify:local",
};

export function createReleaseProjectStatusHandoff(
  project = {},
  outputPaths = {},
) {
  const localVerification = project.localVerification ?? {};
  const handoff = localVerification.handoff ?? {};
  const jsonPath = readString(
    outputPaths.projectStatus,
    readString(handoff.jsonPath, defaultProjectStatusHandoff.jsonPath),
  );
  const markdownPath = readString(
    outputPaths.projectStatusMarkdown,
    readString(handoff.markdownPath, defaultProjectStatusHandoff.markdownPath),
  );

  return {
    command: createProjectStatusHandoffCommand({ jsonPath, markdownPath }),
    jsonPath,
    markdownPath,
    shortcut: readString(
      localVerification.shortcut,
      defaultProjectStatusHandoff.shortcut,
    ),
  };
}

function createProjectStatusHandoffCommand(input) {
  return [
    "pnpm project:status",
    "--",
    "--all-actions",
    "--output",
    input.jsonPath,
    "--markdown-output",
    input.markdownPath,
  ].join(" ");
}

function readString(value, fallback) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
