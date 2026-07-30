import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentIntent } from './entities/payment-intent.entity';
import { PaymentAuditLog } from './entities/payment-audit-log.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { WebhooksController } from './webhooks.controller';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { StripePaymentProvider } from './providers/stripe-payment.provider';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';
import { BillingModule } from '../billing/billing.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { CommerceConfigModule } from '../commerce-config/commerce-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentIntent, PaymentAuditLog, Invoice]),
    BillingModule,
    WorkspacesModule,
    CommerceConfigModule,
  ],
  controllers: [PaymentsController, WebhooksController],
  providers: [
    MockPaymentProvider,
    StripePaymentProvider,
    PaymentProviderRegistry,
    PaymentsService,
  ],
  exports: [PaymentsService, PaymentProviderRegistry],
})
export class PaymentsModule {}
