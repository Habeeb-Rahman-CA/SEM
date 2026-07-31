import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationRule } from './entities/automation-rule.entity';
import { AutomationRun } from './entities/automation-run.entity';
import { Event } from '../events/entities/event.entity';
import { Notification } from '../workspaces/entities/notification.entity';
import { EquipmentBooking } from '../equipment/entities/equipment-booking.entity';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { CompetitionsModule } from '../competitions/competitions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AutomationRule,
      AutomationRun,
      Event,
      Notification,
      EquipmentBooking,
    ]),
    WorkspacesModule,
    CompetitionsModule,
  ],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
