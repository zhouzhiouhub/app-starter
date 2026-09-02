const defaultProjectStatusHandoff = {
  command:
    "pnpm project:status -- --all-actions --output tmp/project-status.json --markdown-output tmp/project-status-handoff.md",
  jsonPath: "tmp/project-status.json",
  markdownPath: "tmp/project-status-handoff.md",
  shortcut: "pnpm run verify:local",
};

const projectStatusHandoffLabel = "Project status handoff";

export function createReleaseProjectStatusHandoff(project = {}) {
  const localVerification = project.localVerification ?? {};
  const handoff = localVerification.handoff ?? {};

  return {
    command: readString(
      readProjectStatusHandoffCommand(localVerification),
      defaultProjectStatusHandoff.command,
    ),
    jsonPath: readString(handoff.jsonPath, defaultProjectStatusHandoff.jsonPath),
    markdownPath: readString(
      handoff.markdownPath,
      defaultProjectStatusHandoff.markdownPath,
    ),
    shortcut: readString(
      localVerification.shortcut,
      defaultProjectStatusHandoff.shortcut,
    ),
  };
}

function readProjectStatusHandoffCommand(localVerification) {
  if (!Array.isArray(localVerification.commands)) {
    return null;
  }

  return localVerification.commands.find(
    (command) => command?.label === projectStatusHandoffLabel,
  )?.command;
}

function readString(value, fallback) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
