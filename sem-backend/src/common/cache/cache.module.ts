import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheService } from './cache.service';
import { CacheInvalidator } from './cache.invalidator';
import { CacheAdminController } from './cache-admin.controller';
import { CacheConfigService } from './cache-config.service';
import { CacheConfigEntity } from './entities/cache-config.entity';

/**
 * @Global so any provider can inject CacheService / CacheInvalidator
 * without importing this module in every feature. There is exactly one
 * instance per Nest process, matching the semantics of a shared cache.
 */
@Global()
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([CacheConfigEntity])],
  controllers: [CacheAdminController],
  providers: [CacheService, CacheInvalidator, CacheConfigService],
  exports: [CacheService, CacheInvalidator, CacheConfigService],
})
export class CacheModule {}
