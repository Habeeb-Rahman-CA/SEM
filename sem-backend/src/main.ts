import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { PublicCacheInterceptor } from './common/interceptors/public-cache.interceptor';

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
    const { RedisIoAdapter } = require('./common/adapters/redis-io.adapter');
    const redisPort = process.env.REDIS_PORT
      ? parseInt(process.env.REDIS_PORT, 10)
      : 6379;
    const redisPassword = process.env.REDIS_PASSWORD;
    const redisIoAdapter = new RedisIoAdapter(app);
    const connected = await redisIoAdapter.connectToRedis(
      redisHost,
      redisPort,
      redisPassword,
    );
    if (connected) {
      app.useWebSocketAdapter(redisIoAdapter);
    }
  }

  // ── Global prefix ─────────────────────────────────────────────────────────
  // Exclude SEO endpoints so search engines can find them at the URL root.
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'robots.txt', method: RequestMethod.GET },
      { path: 'sitemap.xml', method: RequestMethod.GET },
    ],
  });

  // ── Request context (audit trail for createdBy/updatedBy) ────────────────
  app.useGlobalInterceptors(
    new RequestContextInterceptor(),
    new PublicCacheInterceptor(),
  );

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
      .setTitle('SEM — Sports Event Manager API')
      .setDescription(
        '## Sports Event Manager\n\n' +
          'Full-stack platform for managing sports events, workspaces, competitions, teams, and players.\n\n' +
          '### Authentication\n' +
          'Most endpoints require a **Bearer JWT** access token. Obtain one via `POST /api/auth/login`.\n\n' +
          '### Role hierarchy\n' +
          '- **Super-admin** — platform-wide admin (controls reliability, backups, logs)\n' +
          '- **Workspace Owner / Administrator / Moderator** — workspace-scoped roles\n\n' +
          '### Reliability endpoints\n' +
          'Health, metrics, logs, backups and circuit breakers are grouped under the ' +
          '`Health & Monitoring`, `Admin — Logs`, `Admin — Backups`, and `Admin — Recovery` tags.',
      )
      .setVersion('1.0')
      .setContact('SEM Team', '', '')
      .setLicense('UNLICENSED', '')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Paste your access token here (obtained from POST /api/auth/login)',
        },
        'bearer',
      )
      // Tag order controls the section order in Swagger UI
      .addTag('auth', 'Authentication, registration, and profile management')
      .addTag('workspaces', 'Workspace CRUD and member management')
      .addTag('competitions', 'Tournaments, stages, matches, and lineups')
      .addTag('teams', 'Team management')
      .addTag('players', 'Player management')
      .addTag('events', 'Events within workspaces')
      .addTag('venues', 'Venue management')
      .addTag('upload', 'File and image upload')
      .addTag(
        'Health & Monitoring',
        'Liveness probes, readiness checks, and system metrics',
      )
      .addTag('Admin — Logs', 'Structured error log access (Super-admin only)')
      .addTag(
        'Admin — Backups',
        'Database backup management (Super-admin only)',
      )
      .addTag(
        'Admin — Recovery',
        'Circuit breaker management (Super-admin only)',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true, // keep token across page refreshes
        displayRequestDuration: true, // show ms per request
        docExpansion: 'none', // collapse all sections by default
        filter: true, // enable search box
        tryItOutEnabled: true, // open "Try it out" by default
      },
      customSiteTitle: 'SEM API Docs',
    });
  }

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
  console.log(
    `Health check:              http://localhost:${port}/api/health/live`,
  );
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger documentation:     http://localhost:${port}/api/docs`);
  }
}

bootstrap();
