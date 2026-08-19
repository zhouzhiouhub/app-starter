import assert from "node:assert/strict";
import test from "node:test";
import {
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { ApiExceptionFilter } from "../dist/common/api-exception.filter.js";

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
