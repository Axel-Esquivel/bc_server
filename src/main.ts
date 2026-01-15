import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';
import { SocketsAdapter } from './core/adapters/sockets.adapter';

async function bootstrap() {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.setGlobalPrefix('api');
  const logger = new Logger('Bootstrap');
  logger.log('Global prefix set to /api');
  const envOrigins =
    process.env.CORS_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];
  const isDevelopment = process.env.NODE_ENV === 'development';
  const allowedOrigins = envOrigins.length > 0 ? envOrigins : isDevelopment ? ['http://localhost:4200'] : [];
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  });
  app.useWebSocketAdapter(new SocketsAdapter(app));

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

  await app.init();

  const httpAdapter = app.getHttpAdapter().getInstance();
  const router = httpAdapter?._router;
  if (router?.stack) {
    const routes = router.stack
      .filter((layer: { route?: { path?: string; methods?: Record<string, boolean> } }) => layer.route?.path)
      .map((layer: { route: { path: string; methods: Record<string, boolean> } }) => {
        const methods = Object.keys(layer.route.methods).filter((method) => layer.route.methods[method]);
        return `${methods.join(',').toUpperCase()} ${layer.route.path}`;
      });
    if (routes.length > 0) {
      logger.log(`Routes mounted: ${routes.join(' | ')}`);
    }
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Business Control API running on http://localhost:${port}/api`);
}

bootstrap();
