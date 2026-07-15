import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RequestContextInterceptor } from './common/request-context.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Set global request context interceptor
  app.useGlobalInterceptors(new RequestContextInterceptor());

  // Enable CORS
  const corsOrigin = process.env.CORS_ORIGIN ?? '*';
  app.enableCors({
    origin: corsOrigin === '*' ? '*' : corsOrigin.split(','),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 3000;

  // Set up Swagger API Documentation (only in non-production environments)
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
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger documentation is available at: http://localhost:${port}/api/docs`);
  }
}
// Trigger reload 2
bootstrap();

