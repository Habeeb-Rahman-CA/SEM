import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SeederModule } from './seeder.module';
import { SeederService } from './seeder.service';

async function bootstrap() {
  const logger = new Logger('SeederCLI');
  logger.log('Starting Master Database Seeding CLI Runner...');

  try {
    const app = await NestFactory.createApplicationContext(SeederModule, {
      logger: ['log', 'warn', 'error'],
    });

    const seeder = app.get(SeederService);
    await seeder.seedAll();

    logger.log('✅ Database Seeding CLI Execution Completed Successfully.');
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Database Seeding CLI Failed:', error);
    process.exit(1);
  }
}

bootstrap();
