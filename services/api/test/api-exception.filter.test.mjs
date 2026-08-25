import assert from "node:assert/strict";
import test from "node:test";
import {
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { ApiExceptionFilter } from "../dist/common/api-exception.filter.js";
import {
  createRequestIdHeaderMiddleware,
  readRequestId,
  requestIdHeaderName,
} from "../dist/common/request-id.js";

test("API exception filter hides internal server error messages", () => {
  const filter = new ApiExceptionFilter();
  filter.logger.error = () => undefined;
  const { host, response } = createHost({
    "x-request-id": "request-1",
  });

  filter.catch(
    new InternalServerErrorException(
      "SQL failed at C:\\internal\\path with secret payload.",
    ),
    host,
  );

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, {
    error: {
      code: apiErrorCodes.INTERNAL_ERROR,
      message: "Internal server error.",
      requestId: "request-1",
    },
  });
});

test("API exception filter redacts secrets from internal error logs", () => {
  const filter = new ApiExceptionFilter();
  const { host, response } = createHost({
    "x-request-id": "request-logs",
  });
  let logged = "";
  filter.logger.error = (message) => {
    logged = String(message);
  };
  const error = new Error(
    [
      "Upstream failed Authorization: Bearer header.payload.signature",
      "Authorization: Basic dXNlcjpwYXNz",
      "databaseUrl=postgresql://db-user:db-secret@db.example.com/app",
      '"accessToken":"json-token-value"',
      "rawPem=-----BEGIN PRIVATE KEY-----\nprivate-key-body\n-----END PRIVATE KEY-----",
      "https://uploads.example.com/object?X-Amz-Signature=signed-value#access_token=fragment-token",
    ].join(" "),
  );
  error.stack = `Error: ${error.message}\n    at handler (C:\\internal\\api.ts:1:1)`;

  filter.catch(error, host);

  assert.equal(response.statusCode, 500);
  assert.equal(response.body.error.message, "Internal server error.");
  assert.equal(logged.includes("header.payload.signature"), false);
  assert.equal(logged.includes("dXNlcjpwYXNz"), false);
  assert.equal(logged.includes("db-user"), false);
  assert.equal(logged.includes("db-secret"), false);
  assert.equal(logged.includes("json-token-value"), false);
  assert.equal(logged.includes("private-key-body"), false);
  assert.equal(logged.includes("signed-value"), false);
  assert.equal(logged.includes("fragment-token"), false);
  assert.match(logged, /Authorization: Bearer \[redacted\]/);
  assert.match(logged, /Authorization: Basic \[redacted\]/);
  assert.match(logged, /databaseUrl=\[redacted\]/);
  assert.match(logged, /"accessToken":"\[redacted\]"/);
  assert.match(logged, /rawPem=\[redacted-pem\]/);
  assert.match(logged, /X-Amz-Signature=\[redacted\]/);
  assert.match(logged, /#access_token=\[redacted\]/);
});

test("API exception filter keeps client validation details", () => {
  const filter = new ApiExceptionFilter();
  const { host, response } = createHost();

  filter.catch(
    new BadRequestException({
      code: apiErrorCodes.VALIDATION_ERROR,
      details: { field: "slug" },
      message: "Slug is invalid.",
    }),
    host,
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    error: {
      code: apiErrorCodes.VALIDATION_ERROR,
      details: { field: "slug" },
      message: "Slug is invalid.",
      requestId: "local-dev",
    },
  });
});

test("API exception filter preserves payload-too-large parser errors", () => {
  const filter = new ApiExceptionFilter();
  const { host, response } = createHost({
    "x-request-id": "request-body-too-large",
  });
  const error = new Error("request entity too large");
  error.statusCode = 413;

  filter.catch(error, host);

  assert.equal(response.statusCode, 413);
  assert.deepEqual(response.body, {
    error: {
      code: apiErrorCodes.VALIDATION_ERROR,
      message: "Request body is too large.",
      requestId: "request-body-too-large",
    },
  });
});

test("API exception filter normalizes JSON parser failures", () => {
  const filter = new ApiExceptionFilter();
  const { host, response } = createHost({
    "x-request-id": "request-json-parse",
  });
  const error = new SyntaxError("Unexpected token secret-token");
  error.status = 400;
  error.type = "entity.parse.failed";

  filter.catch(error, host);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    error: {
      code: apiErrorCodes.VALIDATION_ERROR,
      message: "Request body must be valid JSON.",
      requestId: "request-json-parse",
    },
  });
});

test("API exception filter redacts secrets from client error responses", () => {
  const filter = new ApiExceptionFilter();
  const { host, response } = createHost();

  filter.catch(
    new BadRequestException({
      code: apiErrorCodes.VALIDATION_ERROR,
      details: {
        attempts: [
          "Authorization: Bearer header.payload.signature",
          "Authorization: Basic client-basic-secret",
          { secretAccessKey: "r2-secret" },
        ],
        callbackUrl:
          "https://auth.example.com/callback#access_token=fragment-token",
        nested: {
          databaseUrl: "postgresql://db-user:db-secret@db.example.com/app",
        },
        token: "detail-token",
      },
      message: "Invalid callback token=message-secret",
    }),
    host,
  );

  assert.equal(response.statusCode, 400);
  assert.equal(
    response.body.error.message,
    "Invalid callback token=[redacted]",
  );
  assert.equal(response.body.error.details.token, "[redacted]");
  assert.equal(
    response.body.error.details.callbackUrl,
    "https://auth.example.com/callback#access_token=[redacted]",
  );
  assert.equal(
    response.body.error.details.nested.databaseUrl,
    "[redacted]",
  );
  assert.equal(
    response.body.error.details.attempts[0],
    "Authorization: Bearer [redacted]",
  );
  assert.equal(
    response.body.error.details.attempts[1],
    "Authorization: Basic [redacted]",
  );
  assert.equal(
    response.body.error.details.attempts[2].secretAccessKey,
    "[redacted]",
  );
  const serialized = JSON.stringify(response.body);
  assert.equal(serialized.includes("message-secret"), false);
  assert.equal(serialized.includes("detail-token"), false);
  assert.equal(serialized.includes("db-user"), false);
  assert.equal(serialized.includes("db-secret"), false);
  assert.equal(serialized.includes("fragment-token"), false);
  assert.equal(serialized.includes("header.payload.signature"), false);
  assert.equal(serialized.includes("client-basic-secret"), false);
  assert.equal(serialized.includes("r2-secret"), false);
});

test("request id helper accepts only compact safe request identifiers", () => {
  assert.equal(
    readRequestId({ "x-request-id": " request-1.alpha:beta_2 " }),
    "request-1.alpha:beta_2",
  );
  assert.equal(readRequestId({ "x-request-id": " " }), "local-dev");
  assert.equal(
    readRequestId({ "x-request-id": "request-1\nset-cookie: secret=1" }),
    "local-dev",
  );
  assert.equal(
    readRequestId({ "x-request-id": "a".repeat(129) }),
    "local-dev",
  );
  assert.equal(
    readRequestId(
      { "x-request-id": "request-1\nset-cookie: secret=1" },
      "generated-request-1",
    ),
    "generated-request-1",
  );
});

test("request id middleware sets a safe response header", () => {
  const middleware = createRequestIdHeaderMiddleware(
    () => "generated-request-1",
  );
  const request = {
    headers: {
      "x-request-id": " request-1 ",
    },
  };
  const response = createHeaderResponse();
  let nextCalled = false;

  middleware(request, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(response.headers[requestIdHeaderName], "request-1");
  assert.equal(request.headers["x-request-id"], "request-1");
});

test("request id middleware replaces unsafe request ids before downstream use", () => {
  const middleware = createRequestIdHeaderMiddleware(
    () => "generated-request-2",
  );
  const request = {
    headers: {
      "x-request-id": "request-1\nx-secret: leaked",
    },
  };
  const response = createHeaderResponse();

  middleware(request, response, () => undefined);

  assert.equal(response.headers[requestIdHeaderName], "generated-request-2");
  assert.equal(request.headers["x-request-id"], "generated-request-2");
});

test("API exception filter sanitizes unsafe request ids", () => {
  const filter = new ApiExceptionFilter();
  const { host, response } = createHost({
    "x-request-id": "request-1\nx-secret: leaked",
  });

  filter.catch(new BadRequestException("Invalid input."), host);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error.requestId, "local-dev");
});

function createHost(headers = {}) {
  const response = {
    body: null,
    statusCode: null,
    status(statusCode) {
      response.statusCode = statusCode;
      return {
        json(body) {
          response.body = body;
        },
      };
    },
  };

  return {
    host: {
      switchToHttp() {
        return {
          getRequest: () => ({ headers }),
          getResponse: () => response,
        };
      },
    },
    response,
  };
}

function createHeaderResponse() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };
}
