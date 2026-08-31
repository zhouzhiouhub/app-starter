export function formatManifestDesignReferenceLinks(check) {
  if (!hasManifestDesignReferenceCounts(check)) {
    return null;
  }

  const present = check.presentDesignReferenceCount;
  const referenced = check.referencedDesignReferenceCount;

  return referenced === 0 ? `${present} linked` : `${present}/${referenced} linked`;
}

export function formatManifestDesignReferenceSummary(check) {
  if (!hasManifestDesignReferenceCounts(check)) {
    return null;
  }

  const present = check.presentDesignReferenceCount;
  const referenced = check.referencedDesignReferenceCount;
  const count = referenced === 0 ? present : `${present}/${referenced}`;

  return `${count} manifest-linked design references`;
}

export function formatRequiredSourceReferenceAvailability(
  referenceImport,
  options = {},
) {
  if (!hasRequiredReferenceCounts(referenceImport)) {
    return null;
  }

  const noun = options.includeNoun === false ? "" : " required source references";
  const statusCounts = readRequiredReferenceStatusCounts(
    referenceImport.requiredReferenceStatusCounts,
  );

  if (statusCounts) {
    const available =
      statusCounts.ready + statusCounts.updated + statusCounts.wouldUpdate;
    const statusText =
      options.includeStatusCounts === false
        ? ""
        : formatRequiredReferenceStatusCounts(statusCounts);

    return `${available}/${referenceImport.requiredReferenceCount}${noun} available${statusText}`;
  }

  return `${referenceImport.requiredReferenceEntryCount}/${referenceImport.requiredReferenceCount}${noun} tracked`;
}

export function formatRequiredReferenceStatusCounts(counts) {
  const statusCounts = readRequiredReferenceStatusCounts(counts);

  if (!statusCounts) {
    return "";
  }

  const values = [
    formatStatusCount(statusCounts.missing, "missing"),
    formatStatusCount(statusCounts.ready, "ready"),
    formatStatusCount(statusCounts.wouldUpdate, "would-update"),
    formatStatusCount(statusCounts.updated, "updated"),
    formatStatusCount(statusCounts.invalid, "invalid"),
  ].filter(Boolean);

  return values.length > 0 ? ` (${values.join(", ")})` : "";
}

function hasManifestDesignReferenceCounts(check) {
  return (
    Number.isFinite(check?.presentDesignReferenceCount) &&
    Number.isFinite(check?.referencedDesignReferenceCount)
  );
}

function hasRequiredReferenceCounts(referenceImport) {
  return (
    Number.isFinite(referenceImport?.requiredReferenceCount) &&
    Number.isFinite(referenceImport?.requiredReferenceEntryCount)
  );
}

function readRequiredReferenceStatusCounts(counts) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    return null;
  }

  return {
    invalid: readCount(counts.invalid),
    missing: readCount(counts.missing),
    ready: readCount(counts.ready),
    updated: readCount(counts.updated),
    wouldUpdate: readCount(counts.wouldUpdate),
  };
}

function readCount(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function formatStatusCount(count, label) {
  return count > 0 ? `${count} ${label}` : null;
}
