import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RequestContextInterceptor } from './common/request-context.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Structured logging — keep NestJS logger active; Winston supplements it
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // ── Graceful Shutdown ─────────────────────────────────────────────────────
  // Enables onApplicationShutdown() hooks across all providers (e.g. RecoveryService)
  app.enableShutdownHooks();

  // ── Redis Socket.IO adapter (horizontal scaling) ──────────────────────────
  const redisHost = process.env.REDIS_HOST;
  if (redisHost) {
    const { RedisIoAdapter } = require('./common/redis-io.adapter');
    const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;
    const redisPassword = process.env.REDIS_PASSWORD;
    const redisIoAdapter = new RedisIoAdapter(app);
    const connected = await redisIoAdapter.connectToRedis(redisHost, redisPort, redisPassword);
    if (connected) {
      app.useWebSocketAdapter(redisIoAdapter);
    }
  }

  // ── Global prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Request context (audit trail for createdBy/updatedBy) ────────────────
  app.useGlobalInterceptors(new RequestContextInterceptor());

  // Note: AllExceptionsFilter is registered via APP_FILTER in AppModule
  // so it is fully DI-aware (ErrorLoggerService injected automatically)

  // ── CORS ──────────────────────────────────────────────────────────────────
  const corsOrigin = process.env.CORS_ORIGIN ?? '*';
  app.enableCors({
    origin: corsOrigin === '*' ? '*' : corsOrigin.split(','),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // ── Validation ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 3000;

  // ── Swagger (non-production only) ─────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SEM API')
      .setDescription('Sports Event Manager API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
  console.log(`Health check:              http://localhost:${port}/api/health/live`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger documentation:     http://localhost:${port}/api/docs`);
  }
}

bootstrap();
