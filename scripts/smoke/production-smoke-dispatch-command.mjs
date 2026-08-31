const defaultWorkflowFile = "production-smoke.yml";
const defaultRef = "main";

export const productionSmokeDispatchInputs = [
  {
    name: "visual_artifact_name",
    value: "page-builder-visual-fixture-<run_number>",
  },
  {
    name: "visual_artifact_run_id",
    value: "<Page Builder Visual workflow run id>",
  },
  {
    name: "local_verification_run_url",
    value: "<main CI run URL>",
  },
  {
    name: "local_verification_artifact_name",
    value: "local-verification-<run_number>",
  },
  {
    name: "release_tag",
    value: "<tag>",
  },
  {
    name: "rollback_target",
    value: "<target>",
  },
  {
    name: "storefront_url",
    value: "<public HTTPS storefront URL>",
  },
];

export function createProductionSmokeDispatchCommand(options = {}) {
  const workflowFile = readText(options.workflowFile) ?? defaultWorkflowFile;
  const ref = readText(options.ref) ?? defaultRef;
  const inputs = Array.isArray(options.inputs)
    ? options.inputs
    : productionSmokeDispatchInputs;

  return [
    "gh workflow run",
    workflowFile,
    "--ref",
    ref,
    ...inputs.flatMap(formatDispatchInput),
  ].join(" ");
}

function formatDispatchInput(input) {
  const name = readText(input?.name);
  const value = readText(input?.value);

  return name && value ? ["-f", `${name}=${quoteShellValue(value)}`] : [];
}

function quoteShellValue(value) {
  return `"${value.replaceAll('"', '\\"')}"`;
}

function readText(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
