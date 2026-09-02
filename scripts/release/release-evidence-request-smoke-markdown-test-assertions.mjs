import assert from "node:assert/strict";

export function assertProductionSmokeRequest(markdown, paths) {
  assert.match(
    markdown,
    new RegExp(
      `Production Smoke request: \`pnpm smoke:request -- --output ${escapeRegExp(
        paths.smokeOutputPath,
      )} --inputs-output ${escapeRegExp(
        paths.smokeInputsOutputPath,
      )} --inputs-table-output ${escapeRegExp(
        paths.smokeInputsTableOutputPath,
      )} --inputs-json-output ${escapeRegExp(
        paths.smokeInputsJsonOutputPath,
      )}\``,
    ),
  );
  assert.match(
    markdown,
    new RegExp(
      `Production Smoke dispatch inputs output: \`${escapeRegExp(
        paths.smokeInputsOutputPath,
      )}\``,
    ),
  );
  assert.match(
    markdown,
    new RegExp(
      `Production Smoke dispatch inputs table output: \`${escapeRegExp(
        paths.smokeInputsTableOutputPath,
      )}\``,
    ),
  );
  assert.match(
    markdown,
    new RegExp(
      `Production Smoke dispatch inputs JSON output: \`${escapeRegExp(
        paths.smokeInputsJsonOutputPath,
      )}\``,
    ),
  );
  assert.match(
    markdown,
    new RegExp(
      `Dispatch inputs output: \`${escapeRegExp(
        paths.smokeInputsOutputPath,
      )}\``,
    ),
  );
  assert.match(
    markdown,
    new RegExp(
      `Dispatch inputs table output: \`${escapeRegExp(
        paths.smokeInputsTableOutputPath,
      )}\``,
    ),
  );
  assert.match(
    markdown,
    new RegExp(
      `Dispatch inputs JSON output: \`${escapeRegExp(
        paths.smokeInputsJsonOutputPath,
      )}\``,
    ),
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
