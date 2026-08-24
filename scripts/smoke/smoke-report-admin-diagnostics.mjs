export function readAdminAppFailureActions(details) {
  const adminApp = readPlainRecord(details.adminApp);
  const actions = [];

  if (adminApp.hasRootElement === false) {
    actions.push("Check Admin build output serves the React root HTML at ADMIN_URL.");
  }

  if (adminApp.hasModuleScript === false || adminApp.moduleScriptUrlIssue) {
    actions.push(
      "Serve the Admin module entry script from the same ADMIN_URL origin without credentials, query strings, or fragments.",
    );
  }

  if (
    adminApp.moduleScriptOk === false ||
    adminApp.moduleScriptHasJavaScriptContentType === false
  ) {
    actions.push(
      "Check the Admin module entry script is deployed and served with a JavaScript content type.",
    );
  }

  if (hasItems(adminApp.modulePreloadUrlIssues)) {
    actions.push(
      "Serve Admin modulepreload chunks from the same ADMIN_URL origin without credentials, query strings, or fragments.",
    );
  }

  if (hasItems(adminApp.modulePreloadFailures)) {
    actions.push(
      "Check Admin modulepreload chunks are deployed and served with a JavaScript content type.",
    );
  }

  if (hasItems(adminApp.stylesheetUrlIssues)) {
    actions.push(
      "Serve Admin stylesheets from the same ADMIN_URL origin without credentials, query strings, or fragments.",
    );
  }

  if (hasItems(adminApp.stylesheetFailures)) {
    actions.push(
      "Check Admin stylesheet assets are deployed and served with a CSS content type.",
    );
  }

  return actions;
}

function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

function readPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}
