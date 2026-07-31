import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheService } from './cache.service';
import { CacheInvalidator } from './cache.invalidator';
import { CacheAdminController } from './cache-admin.controller';

/**
 * @Global so any provider can inject CacheService / CacheInvalidator
 * without importing this module in every feature. There is exactly one
 * instance per Nest process, matching the semantics of a shared cache.
 */
@Global()
@Module({
  imports: [ConfigModule],
  controllers: [CacheAdminController],
  providers: [CacheService, CacheInvalidator],
  exports: [CacheService, CacheInvalidator],
})
export class CacheModule {}
