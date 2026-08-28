import { formatSmokeText } from "./smoke-text.mjs";

const commitShaPattern = /^[a-f0-9]{40}$/iu;
const repositoryPattern = /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/iu;
const runIdPattern = /^[0-9]+$/u;
const workflowMaxLength = 120;

export const smokeSourceRequiredFields = [
  "commitSha",
  "repository",
  "runId",
  "workflowRunUrl",
];

export function readSmokeSourceMetadata(env = process.env) {
  const repository = readRepository(
    readFirstEnv(env, "SMOKE_SOURCE_REPOSITORY", "GITHUB_REPOSITORY"),
  );
  const runId = readNumericId(
    readFirstEnv(env, "SMOKE_SOURCE_RUN_ID", "GITHUB_RUN_ID"),
  );
  const explicitRunUrl = readWorkflowRunUrl(
    readFirstEnv(env, "SMOKE_SOURCE_WORKFLOW_RUN_URL"),
  );

  return {
    commitSha: readCommitSha(
      readFirstEnv(env, "SMOKE_SOURCE_COMMIT_SHA", "GITHUB_SHA"),
    ),
    repository,
    runId,
    runNumber: readNumericId(
      readFirstEnv(env, "SMOKE_SOURCE_RUN_NUMBER", "GITHUB_RUN_NUMBER"),
    ),
    workflow: readWorkflowName(
      readFirstEnv(env, "SMOKE_SOURCE_WORKFLOW", "GITHUB_WORKFLOW"),
    ),
    workflowRunUrl:
      explicitRunUrl ??
      createWorkflowRunUrl({
        repository,
        runId,
        serverUrl: readGitHubServerUrl(env.GITHUB_SERVER_URL),
      }),
  };
}

export function normalizeSmokeSourceMetadata(source) {
  if (!isPlainRecord(source)) {
    return createEmptySmokeSourceMetadata();
  }

  return {
    commitSha: readCommitSha(source.commitSha),
    repository: readRepository(source.repository),
    runId: readNumericId(source.runId),
    runNumber: readNumericId(source.runNumber),
    workflow: readWorkflowName(source.workflow),
    workflowRunUrl: readWorkflowRunUrl(source.workflowRunUrl),
  };
}

export function readMissingSmokeSourceFields(source) {
  const normalized = normalizeSmokeSourceMetadata(source);

  return smokeSourceRequiredFields.filter((field) => !normalized[field]);
}

export function createEmptySmokeSourceMetadata() {
  return {
    commitSha: null,
    repository: null,
    runId: null,
    runNumber: null,
    workflow: null,
    workflowRunUrl: null,
  };
}

function readFirstEnv(env, ...names) {
  for (const name of names) {
    const value = env[name];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function readCommitSha(value) {
  const text = readStrictText(value);
  return text && commitShaPattern.test(text) ? text.toLowerCase() : null;
}

function readRepository(value) {
  const text = readStrictText(value);
  return text && repositoryPattern.test(text) ? text : null;
}

function readNumericId(value) {
  const text = readStrictText(value);
  return text && runIdPattern.test(text) ? text : null;
}

function readWorkflowName(value) {
  const text = readStrictText(value);

  return text ? formatSmokeText(text, { maxLength: workflowMaxLength }) : null;
}

function readGitHubServerUrl(value) {
  if (value === undefined || value === null || value === "") {
    return "https://github.com";
  }

  const text = readStrictText(value);

  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function createWorkflowRunUrl({ repository, runId, serverUrl }) {
  if (!repository || !runId || !serverUrl) {
    return null;
  }

  return `${serverUrl}/${repository}/actions/runs/${runId}`;
}

function readWorkflowRunUrl(value) {
  const text = readStrictText(value);

  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !/^\/[^/]+\/[^/]+\/actions\/runs\/[0-9]+$/u.test(url.pathname)
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function readStrictText(value) {
  if (typeof value !== "string" || value.trim() !== value || !value) {
    return null;
  }

  return value;
}

function isPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}
