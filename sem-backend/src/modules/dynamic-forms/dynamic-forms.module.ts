import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DynamicFormsService } from './dynamic-forms.service';
import { DynamicFormsController } from './dynamic-forms.controller';
import { PublicDynamicFormsController } from './public-dynamic-forms.controller';
import { DynamicFormEntity } from './entities/dynamic-form.entity';
import { FormSubmissionEntity } from './entities/form-submission.entity';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DynamicFormEntity, FormSubmissionEntity]),
    WorkspacesModule,
  ],
  controllers: [DynamicFormsController, PublicDynamicFormsController],
  providers: [DynamicFormsService],
  exports: [DynamicFormsService],
})
export class DynamicFormsModule {}
