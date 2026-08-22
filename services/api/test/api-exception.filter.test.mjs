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
