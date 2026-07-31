import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Volunteer } from './entities/volunteer.entity';
import { VolunteerShift } from './entities/volunteer-shift.entity';
import { VolunteerAssignment } from './entities/volunteer-assignment.entity';
import { VolunteersService } from './volunteers.service';
import { VolunteersController } from './volunteers.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Volunteer, VolunteerShift, VolunteerAssignment]),
    WorkspacesModule,
  ],
  controllers: [VolunteersController],
  providers: [VolunteersService],
  exports: [VolunteersService],
})
export class VolunteersModule {}
