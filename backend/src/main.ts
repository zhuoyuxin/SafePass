import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { appConfig } from "./config/app-config";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: appConfig.frontendOrigin,
      credentials: false
    }
  });

  // Enable global DTO validation and reject unknown payload fields.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  app.enableShutdownHooks();
  await app.listen(appConfig.port);

  // Avoid logging sensitive config values.
  // eslint-disable-next-line no-console
  console.log(`Backend ready at http://localhost:${appConfig.port}`);
}

bootstrap();
