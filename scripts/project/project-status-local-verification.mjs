const localVerificationShortcut = "pnpm run verify:local";
const defaultLocalVerificationHandoff = {
  jsonPath: "tmp/project-status.json",
  markdownPath: "tmp/project-status-handoff.md",
};

const localVerificationCommands = [
  {
    command: "pnpm install --frozen-lockfile",
    label: "Install",
  },
  {
    command: "pnpm run check:file-size",
    label: "File size guard",
  },
  {
    command: "pnpm typecheck",
    label: "TypeScript",
  },
  {
    command: "pnpm lint",
    label: "Lint",
  },
  {
    command: "pnpm test",
    label: "Tests",
  },
  {
    command: "pnpm build",
    label: "Build",
  },
  {
    command: createProjectStatusHandoffCommand(defaultLocalVerificationHandoff),
    label: "Project status handoff",
  },
];

export function createLocalVerificationSummary(input = {}) {
  const handoff = createLocalVerificationHandoff(input.handoff);
  const commands = createLocalVerificationCommands(handoff);

  return {
    commandCount: commands.length,
    commands,
    handoff,
    shortcut: localVerificationShortcut,
    source: "CI verify job and local package scripts",
  };
}

function createLocalVerificationCommands(handoff) {
  return localVerificationCommands.map((item) => ({
    command:
      item.label === "Project status handoff"
        ? createProjectStatusHandoffCommand(handoff)
        : item.command,
    label: item.label,
    status: "configured",
  }));
}

function createLocalVerificationHandoff(input = {}) {
  return {
    jsonPath: readString(input.jsonPath, defaultLocalVerificationHandoff.jsonPath),
    markdownPath: readString(
      input.markdownPath,
      defaultLocalVerificationHandoff.markdownPath,
    ),
  };
}

function createProjectStatusHandoffCommand(handoff) {
  return [
    "pnpm project:status",
    "--",
    "--all-actions",
    "--output",
    handoff.jsonPath,
    "--markdown-output",
    handoff.markdownPath,
  ].join(" ");
}

function readString(value, fallback) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
