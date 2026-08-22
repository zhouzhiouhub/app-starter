import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ApiExceptionFilter } from "./common/api-exception.filter.js";
import {
  createCorsOriginResolver,
  isProductionCorsEnvironment,
  readConfiguredCorsOrigins,
} from "./common/cors-origin.js";
import {
  requestIdHeaderMiddleware,
  requestIdHeaderName,
} from "./common/request-id.js";
import { AppModule } from "./modules/app.module.js";
import { AUTH_LOGIN_PATH } from "./modules/identity/identity.login-hint.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configuredOrigins = readConfiguredCorsOrigins();

  app.use(requestIdHeaderMiddleware);
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      forbidUnknownValues: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
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

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port, "0.0.0.0");
  const logger = new Logger("Bootstrap");
  logger.log(`API listening on 0.0.0.0:${port}`);
  logger.log(`Admin login API: POST ${AUTH_LOGIN_PATH}`);
}

void bootstrap();
