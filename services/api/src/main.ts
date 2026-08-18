import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ApiExceptionFilter } from "./common/api-exception.filter.js";
import { AppModule } from "./modules/app.module.js";
import { AUTH_LOGIN_PATH } from "./modules/identity/identity.login-hint.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configuredOrigins = [
    process.env.WEB_URL ?? "http://localhost:3000",
    process.env.ADMIN_URL ?? "http://localhost:5173",
  ];

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
      "X-Request-Id",
    ],
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "OPTIONS"],
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allowed?: boolean) => void,
    ) => {
      if (
        !origin ||
        configuredOrigins.includes(origin) ||
        (process.env.NODE_ENV !== "production" && isAllowedDevOrigin(origin))
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin denied: ${origin}`));
    },
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port, "0.0.0.0");
  const logger = new Logger("Bootstrap");
  logger.log(`API listening on 0.0.0.0:${port}`);
  logger.log(`Admin login API: POST ${AUTH_LOGIN_PATH}`);
}

function isAllowedDevOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    if (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1"
    ) {
      return true;
    }

    return isPrivateIpv4(url.hostname);
  } catch {
    return false;
  }
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part));

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const first = parts[0] ?? -1;
  const second = parts[1] ?? -1;

  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

void bootstrap();
