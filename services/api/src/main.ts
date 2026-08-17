import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      forbidUnknownValues: true,
      transform: true,
      whitelist: true
    })
  );
  app.enableCors({
    origin: [
      process.env.WEB_URL ?? "http://localhost:3000",
      process.env.ADMIN_URL ?? "http://localhost:5173"
    ]
  });

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000);
}

void bootstrap();
