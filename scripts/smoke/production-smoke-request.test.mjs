import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import test from "node:test";
import {
  createProductionSmokeDispatchArtifact,
  readProductionSmokeDispatchCliConfig,
} from "./production-smoke-dispatch-cli.mjs";
import {
  createProductionSmokeRequestCommand,
  productionSmokeDispatchInputs,
} from "./production-smoke-dispatch-command.mjs";
import {
  createProductionSmokeDispatchInputsText,
  defaultProductionSmokeDispatchInputsOutputPath,
} from "./production-smoke-dispatch-inputs-output.mjs";
import {
  createProductionSmokeDispatchInputsTable,
  normalizeProductionSmokeDispatchInputsTableOutputPath,
} from "./production-smoke-dispatch-inputs-table-output.mjs";
import {
  createProductionSmokeDispatchInputsManifest,
  normalizeProductionSmokeDispatchInputsManifestOutputPath,
} from "./production-smoke-dispatch-inputs-manifest-output.mjs";
import {
  createProductionSmokeRequestMarkdown,
  normalizeProductionSmokeRequestOutputPath,
  readProductionSmokeRequestCliConfig,
  runProductionSmokeRequestCli,
} from "./production-smoke-request.mjs";

test("production smoke request Markdown is operator-facing", () => {
  const artifact = createProductionSmokeDispatchArtifact(
    readProductionSmokeDispatchCliConfig([]),
  );
  const markdown = createProductionSmokeRequestMarkdown({
    ...artifact,
    inputsTableOutputPath:
      "artifacts/production-smoke/production-smoke-dispatch-inputs.tsv",
    inputsJsonOutputPath:
      "artifacts/production-smoke/production-smoke-dispatch-inputs.json",
    inputsOutputPath: defaultProductionSmokeDispatchInputsOutputPath,
  });

  assert.match(markdown, /^# Production Smoke Evidence Request/m);
  assert.match(markdown, /Status: `needs-inputs`/);
  assert.match(
    markdown,
    /Missing inputs: `visual_artifact_name, visual_artifact_run_id, local_verification_run_url/,
  );
  assert.match(
    markdown,
    /Dispatch inputs output: `artifacts\/production-smoke\/production-smoke-dispatch-inputs\.txt`/,
  );
  assert.match(
    markdown,
    /Dispatch inputs table output: `artifacts\/production-smoke\/production-smoke-dispatch-inputs\.tsv`/,
  );
  assert.match(
    markdown,
    /Dispatch inputs JSON output: `artifacts\/production-smoke\/production-smoke-dispatch-inputs\.json`/,
  );
  assert.match(markdown, /Manual dispatch: `GitHub Actions > Production Smoke/);
  assert.match(
    markdown,
    /Validate dispatch: `pnpm smoke:dispatch -- --inputs-json artifacts\/production-smoke\/production-smoke-dispatch-inputs\.json --require-complete`/,
  );
  assert.match(
    markdown,
    /JSON manifest: `artifacts\/production-smoke\/production-smoke-dispatch-inputs\.json` provides workflow file, ref, and input values for dispatch\./,
  );
  assert.match(
    markdown,
    /CLI overrides: explicit `--workflow-file`, `--ref`, and input flags override JSON manifest values\./,
  );
  assert.match(markdown, /Dispatch template: `gh workflow run production-smoke\.yml --ref main/);
  assert.match(markdown, /- \[ \] `visual_artifact_name`: `page-builder-visual-fixture-<run_number>` - replace before dispatch/);
  assert.match(markdown, /## Evidence Input Sources/);
  assert.match(
    markdown,
    /`visual_artifact_name`: `page-builder-visual-fixture-<run_number>` - Page Builder Visual workflow artifact after visual evidence passes/,
  );
  assert.match(
    markdown,
    /`local_verification_run_url`: `<main CI run URL>` - main CI run URL that uploaded the local verification artifact/,
  );
  assert.match(markdown, /`report_path`: `artifacts\/production-smoke\/smoke-report\.json` \(required; safe JSON output path\)/);
  assert.match(markdown, /- \[ \] `Smoke artifact`: `production-smoke-report-<run_number>`/);
  assert.match(markdown, /Rerun `pnpm project:status -- --summary`/);
  assert.equal(productionSmokeDispatchInputs.length, 7);
});

test("production smoke request CLI writes a Markdown handoff", async () => {
  const root = `tmp/production-smoke-request-${process.pid}-${Date.now()}`;
  const outputPath = `${root}/request.md`;
  const inputsOutputPath = `${root}/dispatch-inputs.txt`;
  const inputsTableOutputPath = `${root}/dispatch-inputs.tsv`;
  const inputsJsonOutputPath = `${root}/dispatch-inputs.json`;
  const stdout = [];

  try {
    const exitCode = await runProductionSmokeRequestCli(
      [
        "--output",
        outputPath,
        "--inputs-output",
        inputsOutputPath,
        "--inputs-table-output",
        inputsTableOutputPath,
        "--inputs-json-output",
        inputsJsonOutputPath,
        "--local-verification-run-url",
        "https://github.com/zhouzhiouhub/app-starter/actions/runs/33400968402",
        "--local-verification-artifact",
        "local-verification-533",
        "--visual-artifact",
        "page-builder-visual-fixture-281",
        "--visual-artifact-run-id",
        "33400968157",
        "--release-tag",
        "v0.1.0",
        "--rollback-target",
        "main@6769bd2",
        "--storefront-url",
        "https://store.brand.com",
      ],
      { stdout: (line) => stdout.push(line) },
    );
    const markdown = await readFile(outputPath, "utf8");
    const inputsText = await readFile(inputsOutputPath, "utf8");
    const inputsTable = await readFile(inputsTableOutputPath, "utf8");
    const inputsManifest = JSON.parse(await readFile(inputsJsonOutputPath, "utf8"));

    assert.equal(exitCode, 0);
    assert.match(stdout.join("\n"), /Production smoke request written:/);
    assert.match(stdout.join("\n"), /Production smoke dispatch inputs written:/);
    assert.match(
      stdout.join("\n"),
      /Production smoke dispatch inputs table written:/,
    );
    assert.match(
      stdout.join("\n"),
      /Production smoke dispatch inputs JSON written:/,
    );
    assert.match(stdout.join("\n"), /Ready to dispatch: yes/);
    assert.doesNotMatch(stdout.join("\n"), /Missing inputs:/);
    assert.match(markdown, /Status: `ready-to-dispatch`/);
    assert.match(markdown, /Missing inputs: `none`/);
    assert.match(markdown, /Dispatch inputs output: `tmp\/production-smoke-request-.+\/dispatch-inputs\.txt`/);
    assert.match(markdown, /Dispatch inputs table output: `tmp\/production-smoke-request-.+\/dispatch-inputs\.tsv`/);
    assert.match(markdown, /Dispatch inputs JSON output: `tmp\/production-smoke-request-.+\/dispatch-inputs\.json`/);
    assert.match(
      markdown,
      /Validate dispatch: `pnpm smoke:dispatch -- --inputs-json tmp\/production-smoke-request-.+\/dispatch-inputs\.json --require-complete`/,
    );
    assert.match(
      markdown,
      /JSON manifest: `tmp\/production-smoke-request-.+\/dispatch-inputs\.json` provides workflow file, ref, and input values for dispatch\./,
    );
    assert.match(markdown, /- \[x\] `visual_artifact_name`: `page-builder-visual-fixture-281` - ready/);
    assert.match(markdown, /- \[x\] `storefront_url`: `https:\/\/store\.brand\.com\/` - ready/);
    assert.match(
      markdown,
      /`visual_artifact_name`: `page-builder-visual-fixture-281` - Page Builder Visual workflow artifact after visual evidence passes/,
    );
    assert.match(
      markdown,
      /`storefront_url`: `https:\/\/store\.brand\.com\/` - public HTTPS storefront URL for the production release/,
    );
    assert.match(inputsText, /^visual_artifact_name=page-builder-visual-fixture-281/m);
    assert.match(inputsText, /^storefront_url=https:\/\/store\.brand\.com\//m);
    assert.match(
      inputsTable,
      /^name\tstatus\tvalue\tsource\trelease_evidence_required\tworkflow_required\tworkflow_description/m,
    );
    assert.match(
      inputsTable,
      /visual_artifact_name\tready\tpage-builder-visual-fixture-281\tPage Builder Visual workflow artifact after visual evidence passes\trequired\toptional\tPage Builder Visual artifact name/,
    );
    assert.equal(inputsManifest.schemaVersion, "production-smoke-dispatch-inputs.v1");
    assert.equal(inputsManifest.status, "ready-to-dispatch");
    assert.equal(inputsManifest.readyToDispatch, true);
    assert.equal(inputsManifest.inputCount, 7);
    assert.equal(inputsManifest.missingInputCount, 0);
    assert.deepEqual(inputsManifest.dispatchManifestContext, {
      inheritedFields: ["workflowFile", "ref", "inputs"],
      overridePolicy:
        "Explicit --workflow-file, --ref, and input flags override JSON manifest values.",
      summary:
        "JSON input manifest carries workflow file, ref, and input values; explicit CLI flags override manifest values.",
    });
    assert.equal(inputsManifest.inputs[0].status, "ready");
    assert.equal(inputsManifest.inputs[0].releaseEvidenceRequired, true);
    assert.equal(inputsManifest.inputs[0].value, "page-builder-visual-fixture-281");
    assert.match(
      inputsManifest.validationCommand,
      /^pnpm smoke:dispatch -- --inputs-json tmp\/production-smoke-request-.+\/dispatch-inputs\.json --require-complete$/,
    );
    assert.equal(inputsManifest.inputSources.length, 7);
    assert.equal(inputsManifest.workflowInputs.length, 14);
    assert.equal(inputsManifest.requiredEvidence.length, 15);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("production smoke request help documents summary fields", async () => {
  const stdout = [];

  const exitCode = await runProductionSmokeRequestCli(["--help"], {
    stdout: (line) => stdout.push(line),
  });
  const help = stdout.join("\n");

  assert.equal(exitCode, 0);
  assert.match(help, /terminal summary\s+and Markdown status report dispatch readiness/i);
  assert.match(help, /missing input names/i);
  assert.match(help, /--inputs-output <path>/);
  assert.match(help, /--inputs-table-output <path>/);
  assert.match(help, /--inputs-json-output <path>/);
});

test("production smoke request config validates output and evidence inputs", () => {
  const config = readProductionSmokeRequestCliConfig([
    "--",
    "--output",
    String.raw`artifacts\\production-smoke\\production-smoke-request.md`,
    "--inputs-output",
    String.raw`artifacts\\production-smoke\\production-smoke-dispatch-inputs.txt`,
    "--inputs-table-output",
    String.raw`artifacts\\production-smoke\\production-smoke-dispatch-inputs.tsv`,
    "--inputs-json-output",
    String.raw`artifacts\\production-smoke\\production-smoke-dispatch-inputs.json`,
    "--visual-artifact-run-id=33400968157",
  ]);

  assert.equal(
    config.outputPath,
    "artifacts/production-smoke/production-smoke-request.md",
  );
  assert.equal(
    config.inputsOutputPath,
    "artifacts/production-smoke/production-smoke-dispatch-inputs.txt",
  );
  assert.equal(
    config.inputsTableOutputPath,
    "artifacts/production-smoke/production-smoke-dispatch-inputs.tsv",
  );
  assert.equal(
    config.inputsJsonOutputPath,
    "artifacts/production-smoke/production-smoke-dispatch-inputs.json",
  );
  assert.equal(
    config.dispatchConfig.inputOverrides.get("visual_artifact_run_id"),
    "33400968157",
  );
  assert.equal(
    normalizeProductionSmokeRequestOutputPath("tmp/smoke-request.MD"),
    "tmp/smoke-request.MD",
  );
  assert.throws(
    () => normalizeProductionSmokeRequestOutputPath("README.md"),
    /Production Smoke request must be under tmp\/, reports\/, artifacts\/, or \.tmp\//,
  );
  assert.equal(
    normalizeProductionSmokeDispatchInputsTableOutputPath(
      "tmp/production-smoke-dispatch-inputs.TSV",
    ),
    "tmp/production-smoke-dispatch-inputs.TSV",
  );
  assert.throws(
    () => normalizeProductionSmokeDispatchInputsTableOutputPath("tmp/table.txt"),
    /Production Smoke dispatch inputs table output must end with \.tsv/,
  );
  assert.equal(
    normalizeProductionSmokeDispatchInputsManifestOutputPath(
      "tmp/production-smoke-dispatch-inputs.JSON",
    ),
    "tmp/production-smoke-dispatch-inputs.JSON",
  );
  assert.throws(
    () => normalizeProductionSmokeDispatchInputsManifestOutputPath("tmp/table.tsv"),
    /Production Smoke dispatch inputs JSON output must end with \.json/,
  );
});

test("production smoke request formats dispatch input templates", () => {
  const artifact = createProductionSmokeDispatchArtifact(
    readProductionSmokeDispatchCliConfig([
      "--visual-artifact",
      "page-builder-visual-fixture-281",
    ]),
  );
  const text = createProductionSmokeDispatchInputsText(artifact);
  const table = createProductionSmokeDispatchInputsTable(artifact);
  const manifest = createProductionSmokeDispatchInputsManifest(artifact);

  assert.match(text, /^visual_artifact_name=page-builder-visual-fixture-281/m);
  assert.match(text, /^visual_artifact_run_id=<Page Builder Visual workflow run id>/m);
  assert.match(
    table,
    /^name\tstatus\tvalue\tsource\trelease_evidence_required\tworkflow_required\tworkflow_description/m,
  );
  assert.match(
    table,
    /^visual_artifact_name\tready\tpage-builder-visual-fixture-281\tPage Builder Visual workflow artifact after visual evidence passes\trequired\toptional\tPage Builder Visual artifact name/m,
  );
  assert.match(
    table,
    /^visual_artifact_run_id\tmissing\t<Page Builder Visual workflow run id>/m,
  );
  assert.equal(manifest.status, "needs-inputs");
  assert.equal(manifest.missingInputCount, 6);
  assert.deepEqual(manifest.missingInputs.slice(0, 2), [
    "visual_artifact_run_id",
    "local_verification_run_url",
  ]);
  assert.equal(manifest.inputs[0].status, "ready");
  assert.equal(manifest.inputs[0].releaseEvidenceRequired, true);
  assert.equal(manifest.inputs[1].status, "missing");
  assert.equal(manifest.inputs[1].releaseEvidenceRequired, true);
});

test("production smoke request command is exposed in package CI and docs", async () => {
  const [packageJsonText, workflow, dispatchCli, releaseChecklist, setupDoc, readme] =
    await Promise.all([
      readFile("package.json", "utf8"),
      readFile(".github/workflows/ci.yml", "utf8"),
      readFile("scripts/production-smoke-request.mjs", "utf8"),
      readFile("docs/development/release-checklist.md", "utf8"),
      readFile("docs/development/setup.md", "utf8"),
      readFile("README.md", "utf8"),
    ]);
  const packageJson = JSON.parse(packageJsonText);

  assert.equal(createProductionSmokeRequestCommand(), "pnpm smoke:request");
  assert.equal(
    packageJson.scripts["smoke:request"],
    "node scripts/production-smoke-request.mjs --output artifacts/production-smoke/production-smoke-request.md --inputs-output artifacts/production-smoke/production-smoke-dispatch-inputs.txt --inputs-table-output artifacts/production-smoke/production-smoke-dispatch-inputs.tsv --inputs-json-output artifacts/production-smoke/production-smoke-dispatch-inputs.json",
  );
  assert.match(workflow, /pnpm smoke:request -- --help/);
  assert.match(dispatchCli, /runProductionSmokeRequestCli/);
  assert.match(releaseChecklist, /pnpm smoke:request/);
  assert.match(releaseChecklist, /production-smoke-dispatch-inputs\.txt/);
  assert.match(releaseChecklist, /production-smoke-dispatch-inputs\.tsv/);
  assert.match(releaseChecklist, /production-smoke-dispatch-inputs\.json/);
  assert.match(releaseChecklist, /--inputs-json/);
  assert.match(releaseChecklist, /dispatchManifestContext\.inheritedFields/);
  assert.match(releaseChecklist, /dispatchManifestContext\.overridePolicy/);
  assert.match(releaseChecklist, /evidence input sources/);
  assert.match(setupDoc, /pnpm smoke:request/);
  assert.match(setupDoc, /production-smoke-dispatch-inputs\.txt/);
  assert.match(setupDoc, /production-smoke-dispatch-inputs\.tsv/);
  assert.match(setupDoc, /production-smoke-dispatch-inputs\.json/);
  assert.match(setupDoc, /--inputs-json/);
  assert.match(setupDoc, /dispatchManifestContext\.inheritedFields/);
  assert.match(setupDoc, /dispatchManifestContext\.overridePolicy/);
  assert.match(setupDoc, /Production Smoke\s+Evidence Input Sources/);
  assert.match(readme, /pnpm smoke:request/);
  assert.match(readme, /production-smoke-dispatch-inputs\.txt/);
  assert.match(readme, /production-smoke-dispatch-inputs\.tsv/);
  assert.match(readme, /production-smoke-dispatch-inputs\.json/);
  assert.match(readme, /--inputs-json/);
  assert.match(readme, /dispatchManifestContext\.inheritedFields/);
  assert.match(readme, /dispatchManifestContext\.overridePolicy/);
  assert.match(readme, /inputSources\[\]/);
});
