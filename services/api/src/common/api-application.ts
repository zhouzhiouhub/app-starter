import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { ApiExceptionFilter } from "./api-exception.filter.js";
import {
  createCorsOriginResolver,
  isProductionCorsEnvironment,
  readConfiguredCorsOrigins,
} from "./cors-origin.js";
import {
  requestIdHeaderMiddleware,
  requestIdHeaderName,
} from "./request-id.js";

export const apiRequestBodyLimit = "100kb";

export function configureApiApplication(app: NestExpressApplication) {
  const configuredOrigins = readConfiguredCorsOrigins();

  app.use(requestIdHeaderMiddleware);
  app.enableCors({
    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "Idempotency-Key",
      requestIdHeaderName,
    ],
    exposedHeaders: [requestIdHeaderName],
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "OPTIONS"],
    origin: createCorsOriginResolver({
      configuredOrigins,
      isProduction: isProductionCorsEnvironment(process.env),
    }),
  });
  app.useBodyParser("json", { limit: apiRequestBodyLimit });
  app.useBodyParser("urlencoded", {
    extended: true,
    limit: apiRequestBodyLimit,
  });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      forbidUnknownValues: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
}
