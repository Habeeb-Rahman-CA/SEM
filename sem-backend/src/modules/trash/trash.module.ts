import { Module } from '@nestjs/common';
import { TrashService } from './trash.service';
import { UndoService } from './undo.service';
import { TrashController } from './trash.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [WorkspacesModule],
  controllers: [TrashController],
  providers: [TrashService, UndoService],
  exports: [TrashService, UndoService],
})
export class TrashModule {}
