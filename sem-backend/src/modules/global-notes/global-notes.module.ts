import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalNote } from './entities/global-note.entity';
import { GlobalNotesService } from './global-notes.service';
import { GlobalNotesController } from './global-notes.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { NotificationCenterModule } from '../notification-center/notification-center.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GlobalNote]),
    WorkspacesModule,
    NotificationCenterModule,
  ],
  controllers: [GlobalNotesController],
  providers: [GlobalNotesService],
  exports: [GlobalNotesService],
})
export class GlobalNotesModule {}
