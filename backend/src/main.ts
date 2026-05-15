import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 信任反向代理（Nginx），使 req.ip 取到真实客户端 IP
  app.set("trust proxy", 1);

  // 开启 CORS 方便前端本地调用
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // 全局请求体校验
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix("dp/api");

  const port = 10483;

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 后端已启动: http://localhost:${port}/dp/api`);
}

bootstrap();
