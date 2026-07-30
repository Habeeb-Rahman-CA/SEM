import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { Subscription } from './entities/subscription.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { Event } from '../events/entities/event.entity';
import { GalleryPhoto } from '../gallery/entities/gallery-photo.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PublicPlansController } from './public-plans.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { BillingModule } from '../billing/billing.module';
import { CommerceConfigModule } from '../commerce-config/commerce-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionPlan,
      Subscription,
      Workspace,
      WorkspaceMember,
      Event,
      GalleryPhoto,
    ]),
    WorkspacesModule,
    CommerceConfigModule,
    // forwardRef because BillingModule doesn't actually import
    // SubscriptionsModule, but Nest's cycle detector is conservative and
    // the ref keeps the module tree resilient if that ever changes.
    forwardRef(() => BillingModule),
  ],
  controllers: [SubscriptionsController, PublicPlansController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
