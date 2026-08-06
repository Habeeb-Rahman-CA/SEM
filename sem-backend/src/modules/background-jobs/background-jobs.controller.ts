import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  Res,
  Header,
} from '@nestjs/common';
import type { Response } from 'express';
import { BackgroundJobsService, JobType } from './background-jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('workspaces/:workspaceId/background-jobs')
@UseGuards(JwtAuthGuard)
export class BackgroundJobsController {
  constructor(private readonly backgroundJobsService: BackgroundJobsService) {}

  @Get()
  async getJobs(@Param('workspaceId') workspaceId: string, @Req() req: any) {
    const jobs = await this.backgroundJobsService.getJobs(
      workspaceId,
      req.user?.id,
    );
    return { jobs };
  }

  @Get(':jobId')
  async getJob(
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
    @Req() req: any,
  ) {
    const job = await this.backgroundJobsService.getJob(
      workspaceId,
      jobId,
      req.user?.id,
    );
    return { job };
  }

  @Post('trigger')
  async triggerJob(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: { type: JobType; title: string; payload?: any },
    @Req() req: any,
  ) {
    const job = await this.backgroundJobsService.triggerJob(
      workspaceId,
      dto,
      req.user?.id,
    );
    return { job, message: 'Background job dispatched successfully' };
  }

  @Delete(':jobId')
  async cancelJob(
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
    @Req() req: any,
  ) {
    const job = await this.backgroundJobsService.cancelJob(
      workspaceId,
      jobId,
      req.user?.id,
    );
    return { job, message: 'Job cancelled' };
  }

  @Get(':jobId/download')
  async downloadArtifact(
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const job = await this.backgroundJobsService.getJob(
      workspaceId,
      jobId,
      req.user?.id,
    );

    if (job.type === 'export') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${job.id}-export.csv"`,
      );
      return res.send(
        `ID,Entity,Name,Status,CreatedAt\n1,Player,Ahmed Al-Mansoor,Active,2026-08-01\n2,Player,Carlos Silva,Active,2026-08-02\n3,Team,Falcons FC,Active,2026-08-03\n`,
      );
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${job.id}-report.json"`,
      );
      return res.send(JSON.stringify(job, null, 2));
    }
  }
}
