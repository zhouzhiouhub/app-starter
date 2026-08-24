import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { configureApiApplication } from "./common/api-application.js";
import { AppModule } from "./modules/app.module.js";
import { AUTH_LOGIN_PATH } from "./modules/identity/identity.login-hint.js";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  configureApiApplication(app);

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port, "0.0.0.0");
  const logger = new Logger("Bootstrap");
  logger.log(`API listening on 0.0.0.0:${port}`);
  logger.log(`Admin login API: POST ${AUTH_LOGIN_PATH}`);
}

void bootstrap();
