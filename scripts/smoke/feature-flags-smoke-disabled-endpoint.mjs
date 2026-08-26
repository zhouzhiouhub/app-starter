import { formatSmokeText } from "./smoke-text.mjs";
import { fetchJson } from "./http-json-smoke.mjs";

const maxDisabledEndpointMessageLength = 240;

export async function assertErrorResponse(url, init, expectedCode) {
  const response = await fetchJson(url, init);
  const diagnostic = readDisabledEndpointDiagnostic(response);

  if (diagnostic.status !== 409 || diagnostic.code !== expectedCode) {
    throw new Error(
      `${url} expected 409 ${expectedCode}, got ${formatDisabledEndpointDiagnostic(
        diagnostic,
      )}.`,
    );
  }
}

export function readApiErrorCode(body) {
  return body?.error?.code ?? body?.code ?? null;
}

export function readDisabledEndpointDiagnostic(response) {
  return {
    code: readApiErrorCode(response.body),
    message: redactOptionalSmokeMessage(
      response.body?.error?.message ??
        response.body?.message ??
        response.statusText ??
        null,
    ),
    ...(response.redirectLocation
      ? { redirectLocation: response.redirectLocation }
      : {}),
    status: response.status,
    statusText: response.statusText || "",
  };
}

export function formatDisabledEndpointDiagnostic(diagnostic) {
  const statusText = diagnostic.statusText ? ` ${diagnostic.statusText}` : "";
  const code = diagnostic.code ?? "NO_CODE";
  const message = diagnostic.message ? `: ${diagnostic.message}` : "";
  const redirect = diagnostic.redirectLocation
    ? ` redirect: ${diagnostic.redirectLocation}`
    : "";

  return `${diagnostic.status}${statusText} ${code}${message}${redirect}`;
}

function redactOptionalSmokeMessage(value) {
  return value === null
    ? null
    : formatSmokeText(value, { maxLength: maxDisabledEndpointMessageLength });
}
