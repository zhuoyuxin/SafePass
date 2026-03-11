import "reflect-metadata";

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

  app.enableShutdownHooks();
  await app.listen(appConfig.port);

  // 避免在日志中打印敏感配置，只输出必要服务状态。
  // eslint-disable-next-line no-console
  console.log(`Backend ready at http://localhost:${appConfig.port}`);
}

bootstrap();

