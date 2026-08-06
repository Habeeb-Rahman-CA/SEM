import { Module } from '@nestjs/common';
import { DynamicFormsService } from './dynamic-forms.service';
import { DynamicFormsController } from './dynamic-forms.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [WorkspacesModule],
  controllers: [DynamicFormsController],
  providers: [DynamicFormsService],
  exports: [DynamicFormsService],
})
export class DynamicFormsModule {}
