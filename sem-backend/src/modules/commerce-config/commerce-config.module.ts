import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommerceConfig } from './commerce-config.entity';
import { CommerceConfigService } from './commerce-config.service';

/**
 * Small, dependency-free module so any commerce module (subscriptions,
 * billing, payments) can import it without pulling in a giant dependency
 * graph. The service holds the singleton row + a short-TTL cache.
 */
@Module({
  imports: [TypeOrmModule.forFeature([CommerceConfig])],
  providers: [CommerceConfigService],
  exports: [CommerceConfigService],
})
export class CommerceConfigModule {}
