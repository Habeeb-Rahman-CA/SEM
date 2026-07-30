import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingProfile } from './entities/billing-profile.entity';
import { BillingContact } from './entities/billing-contact.entity';
import { Invoice } from './entities/invoice.entity';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { BILLING_HOOK } from '../subscriptions/subscriptions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BillingProfile, BillingContact, Invoice]),
    WorkspacesModule,
  ],
  controllers: [BillingController],
  providers: [
    BillingService,
    // Bind BillingService to the SubscriptionsModule's BILLING_HOOK token
    // so plan changes auto-generate an invoice. This is a one-way dep —
    // Subscriptions module publishes the token, Billing module fulfils it.
    { provide: BILLING_HOOK, useExisting: BillingService },
  ],
  exports: [BillingService],
})
export class BillingModule {}
