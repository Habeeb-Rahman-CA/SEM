import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipment } from './entities/equipment.entity';
import { EquipmentBooking } from './entities/equipment-booking.entity';
import { EquipmentMaintenance } from './entities/equipment-maintenance.entity';
import { EquipmentHistory } from './entities/equipment-history.entity';
import { EquipmentService } from './equipment.service';
import { EquipmentController } from './equipment.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Equipment,
      EquipmentBooking,
      EquipmentMaintenance,
      EquipmentHistory,
    ]),
    WorkspacesModule,
  ],
  controllers: [EquipmentController],
  providers: [EquipmentService],
  exports: [EquipmentService],
})
export class EquipmentModule {}
