import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { readRequestId, type RequestHeadersLike } from "./request-id.js";

export const CurrentRequestId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context
      .switchToHttp()
      .getRequest<{ headers?: RequestHeadersLike }>();

    return readRequestId(request.headers);
  },
);
