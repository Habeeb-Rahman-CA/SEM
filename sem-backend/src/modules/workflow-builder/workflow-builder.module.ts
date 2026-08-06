import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowBuilderService } from './workflow-builder.service';
import { WorkflowBuilderController } from './workflow-builder.controller';
import { WorkflowItemEntity } from './entities/workflow-item.entity';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowItemEntity]), WorkspacesModule],
  controllers: [WorkflowBuilderController],
  providers: [WorkflowBuilderService],
  exports: [WorkflowBuilderService],
})
export class WorkflowBuilderModule {}
