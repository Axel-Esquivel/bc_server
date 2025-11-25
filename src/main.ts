import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';

async function bootstrap() {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.setGlobalPrefix('api');
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()) ?? ['*'];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.useWebSocketAdapter(new IoAdapter(app));

  app.useGlobalFilters(app.get(HttpExceptionFilter));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const logger = new Logger('Bootstrap');
  await app.init();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Business Control API running on http://localhost:${port}/api`);
}

bootstrap();
