import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test(".env.example documents production smoke runtime variables", async () => {
  const [envExample, infraRunbook] = await Promise.all([
    readFile(".env.example", "utf8"),
    readFile("infra/README.md", "utf8"),
  ]);
  const exampleVariables = parseEnvExampleVariables(envExample);
  const productionRuntimeVariables =
    parseProductionEnvironmentMatrixVariables(infraRunbook);

  for (const variable of productionRuntimeVariables) {
    assert.equal(
      exampleVariables.has(variable),
      true,
      `.env.example must include ${variable} from the production environment matrix.`,
    );
  }

  assert.equal(
    [...exampleVariables].some((variable) => variable.startsWith("PRODUCTION_")),
    false,
    ".env.example must not ask developers to copy GitHub production secret names.",
  );
});

function parseEnvExampleVariables(content) {
  const variables = new Set();

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=/);

    if (match) {
      variables.add(match[1]);
    }
  }

  assert.notEqual(variables.size, 0, ".env.example contains no variables.");
  return variables;
}

function parseProductionEnvironmentMatrixVariables(runbook) {
  const start = runbook.indexOf("### 2. Production Environment Matrix");
  assert.notEqual(start, -1, "Production Environment Matrix section is missing.");

  const end = runbook.indexOf("\n### 3.", start);
  assert.notEqual(end, -1, "Production Environment Matrix section is unbounded.");

  const variables = [];
  const section = runbook.slice(start, end);

  for (const line of section.split(/\r?\n/)) {
    const match = line.match(/^\| `([^`]+)` \|/);

    if (match) {
      variables.push(match[1]);
    }
  }

  assert.notEqual(variables.length, 0, "Production Environment Matrix is empty.");
  return variables;
}
