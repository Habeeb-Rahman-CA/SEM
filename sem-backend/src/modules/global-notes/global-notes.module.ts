import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalNote } from './entities/global-note.entity';
import { GlobalNotesService } from './global-notes.service';
import { GlobalNotesController } from './global-notes.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [TypeOrmModule.forFeature([GlobalNote]), WorkspacesModule],
  controllers: [GlobalNotesController],
  providers: [GlobalNotesService],
  exports: [GlobalNotesService],
})
export class GlobalNotesModule {}
