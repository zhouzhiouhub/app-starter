export const productionSmokeEvidenceInputSources = [
  {
    name: "visual_artifact_name",
    source: "Page Builder Visual workflow artifact after visual evidence passes",
    value: "page-builder-visual-fixture-<run_number>",
  },
  {
    name: "visual_artifact_run_id",
    source: "Page Builder Visual workflow run id that uploaded the visual artifact",
    value: "<Page Builder Visual workflow run id>",
  },
  {
    name: "local_verification_run_url",
    source: "main CI run URL that uploaded the local verification artifact",
    value: "<main CI run URL>",
  },
  {
    name: "local_verification_artifact_name",
    source: "main CI artifact uploaded by the same local verification run",
    value: "local-verification-<run_number>",
  },
  {
    name: "release_tag",
    source: "release operator selected tag for the final release record",
    value: "<tag>",
  },
  {
    name: "rollback_target",
    source: "release operator selected rollback target for the release record",
    value: "<target>",
  },
  {
    name: "storefront_url",
    source: "public HTTPS storefront URL for the production release",
    value: "<public HTTPS storefront URL>",
  },
];
