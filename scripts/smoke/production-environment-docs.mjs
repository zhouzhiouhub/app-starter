const productionEnvironmentMatrixHeading =
  "### 2. Production Environment Matrix";

export function parseEnvExampleVariables(content) {
  const variables = new Set();

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=/);

    if (match) {
      variables.add(match[1]);
    }
  }

  if (variables.size === 0) {
    throw new Error(".env.example contains no variables.");
  }

  return variables;
}

export function parseProductionEnvironmentMatrix(runbook) {
  const start = runbook.indexOf(productionEnvironmentMatrixHeading);

  if (start === -1) {
    throw new Error("Production Environment Matrix section is missing.");
  }

  const end = runbook.indexOf("\n### 3.", start);

  if (end === -1) {
    throw new Error("Production Environment Matrix section is unbounded.");
  }

  const matrix = new Map();
  const section = runbook.slice(start, end);

  for (const line of section.split(/\r?\n/)) {
    const match = line.match(/^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/);

    if (!match) {
      continue;
    }

    const [, variable, source] = match;

    if (matrix.has(variable)) {
      throw new Error(`${variable} is duplicated.`);
    }

    matrix.set(variable, source);
  }

  if (matrix.size === 0) {
    throw new Error("Production Environment Matrix is empty.");
  }

  return matrix;
}

export function parseProductionEnvironmentMatrixVariables(runbook) {
  return [...parseProductionEnvironmentMatrix(runbook).keys()];
}

export function parseProductionSmokeWorkflowEnvironment(workflow) {
  const lines = workflow.split(/\r?\n/);
  const start = lines.findIndex((line) => line === "    env:");

  if (start === -1) {
    throw new Error("Production Smoke workflow env block is missing.");
  }

  const environment = new Map();

  for (const line of lines.slice(start + 1)) {
    if (line === "    steps:") {
      break;
    }

    const match = line.match(/^ {6}([A-Z0-9_]+): (.+)$/);

    if (!match) {
      continue;
    }

    const [, name, value] = match;

    if (environment.has(name)) {
      throw new Error(`${name} is duplicated.`);
    }

    environment.set(name, value);
  }

  if (environment.size === 0) {
    throw new Error("Production Smoke env block is empty.");
  }

  return environment;
}

export function readProductionGithubSourceNames(matrix) {
  const sourceNames = new Set();

  for (const source of matrix.values()) {
    const match = source.match(
      /^\$\{\{\s*(?:secrets|vars)\.([A-Z0-9_]+)\s*\}\}$/,
    );

    if (match) {
      sourceNames.add(match[1]);
    }
  }

  return [...sourceNames].sort();
}

export function shouldDocumentRuntimeEnvironmentVariable(variable) {
  return (
    !variable.startsWith("PROJECT_STATUS_") &&
    !variable.startsWith("RELEASE_") &&
    !variable.startsWith("SMOKE_SOURCE_") &&
    variable !== "SMOKE_REPORT_ARTIFACT_NAME" &&
    variable !== "SMOKE_REPORT_MARKDOWN_PATH"
  );
}
