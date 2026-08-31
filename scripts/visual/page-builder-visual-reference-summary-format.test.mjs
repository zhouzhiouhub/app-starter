import assert from "node:assert/strict";
import test from "node:test";
import {
  formatManifestDesignReferenceLinks,
  formatManifestDesignReferenceSummary,
  formatRequiredSourceReferenceAvailability,
} from "./page-builder-visual-reference-summary-format.mjs";

test("visual reference summary formats manifest-linked references without 0/0", () => {
  assert.equal(
    formatManifestDesignReferenceLinks({
      presentDesignReferenceCount: 0,
      referencedDesignReferenceCount: 0,
    }),
    "0 linked",
  );
  assert.equal(
    formatManifestDesignReferenceSummary({
      presentDesignReferenceCount: 0,
      referencedDesignReferenceCount: 0,
    }),
    "0 manifest-linked design references",
  );
  assert.equal(
    formatManifestDesignReferenceSummary({
      presentDesignReferenceCount: 12,
      referencedDesignReferenceCount: 12,
    }),
    "12/12 manifest-linked design references",
  );
});

test("visual reference summary counts available required source references", () => {
  assert.equal(
    formatRequiredSourceReferenceAvailability(createReferenceImportSummary()),
    "0/12 required source references available (12 missing)",
  );
  assert.equal(
    formatRequiredSourceReferenceAvailability(
      createReferenceImportSummary({
        missing: 0,
        ready: 10,
        updated: 1,
        wouldUpdate: 1,
      }),
      { includeNoun: false },
    ),
    "12/12 available (10 ready, 1 would-update, 1 updated)",
  );
  assert.equal(
    formatRequiredSourceReferenceAvailability(
      createReferenceImportSummary({
        missing: 0,
        ready: 12,
      }),
      { includeStatusCounts: false },
    ),
    "12/12 required source references available",
  );
});

function createReferenceImportSummary(counts = {}) {
  return {
    requiredReferenceCount: 12,
    requiredReferenceEntryCount: 12,
    requiredReferenceStatusCounts: {
      invalid: counts.invalid ?? 0,
      missing: counts.missing ?? 12,
      ready: counts.ready ?? 0,
      updated: counts.updated ?? 0,
      wouldUpdate: counts.wouldUpdate ?? 0,
    },
  };
}
