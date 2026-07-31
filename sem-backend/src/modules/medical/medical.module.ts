import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalProfile } from './entities/medical-profile.entity';
import { MedicalInjury } from './entities/medical-injury.entity';
import { RecoveryPlan } from './entities/recovery-plan.entity';
import { FitnessStatus } from './entities/fitness-status.entity';
import { MedicalAlert } from './entities/medical-alert.entity';
import { Player } from '../players/entities/player.entity';
import { MedicalService } from './medical.service';
import { MedicalController } from './medical.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MedicalProfile,
      MedicalInjury,
      RecoveryPlan,
      FitnessStatus,
      MedicalAlert,
      Player,
    ]),
    WorkspacesModule,
  ],
  controllers: [MedicalController],
  providers: [MedicalService],
  exports: [MedicalService],
})
export class MedicalModule {}
