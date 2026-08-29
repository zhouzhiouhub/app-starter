import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  parseEnvExampleVariables,
  parseProductionEnvironmentMatrixVariables,
} from "./production-environment-docs.mjs";

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
