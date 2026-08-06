import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  WorkflowItemEntity,
  WorkflowModuleType,
  WorkflowStage,
  WorkflowStatus,
  WorkflowTransitionLog,
} from './entities/workflow-item.entity';

export type {
  WorkflowModuleType,
  WorkflowStage,
  WorkflowStatus,
  WorkflowTransitionLog,
};

export interface WorkflowItem {
  id: string;
  workspaceId: string;
  module: WorkflowModuleType;
  itemName: string;
  itemRefId: string;
  currentStage: WorkflowStage;
  status: WorkflowStatus;
  authorName: string;
  reviewerName: string;
  approverName: string;
  comments?: string;
  history: WorkflowTransitionLog[];
  createdAt: string;
}

@Injectable()
export class WorkflowBuilderService implements OnModuleInit {
  private inMemoryWorkflows: Map<string, WorkflowItem[]> = new Map();

  constructor(
    @InjectRepository(WorkflowItemEntity)
    private readonly workflowsRepo: Repository<WorkflowItemEntity>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async onModuleInit() {
    await this.seedInitialWorkflows();
  }

  private async seedInitialWorkflows() {
    try {
      const count = await this.workflowsRepo.count();
      if (count === 0) {
        const wf1 = this.workflowsRepo.create({
          workspaceId: 'default-ws',
          module: 'events',
          itemName: 'Summer League Grand Final 2026',
          itemRefId: 'evt-2026',
          currentStage: 'review',
          status: 'in_review',
          authorName: 'Sarah Jenkins',
          reviewerName: 'Michael Scott',
          approverName: 'David Miller',
          comments: 'Pending venue safety sign-off review',
          history: [
            {
              fromStage: 'draft',
              toStage: 'review',
              action: 'submit',
              actorName: 'Sarah Jenkins',
              comment: 'Created event draft & submitted for review',
              timestamp: new Date(
                Date.now() - 1000 * 60 * 60 * 24,
              ).toISOString(),
            },
          ],
        });

        const wf2 = this.workflowsRepo.create({
          workspaceId: 'default-ws',
          module: 'sponsorships',
          itemName: 'Adidas Platinum League Sponsorship Deal',
          itemRefId: 'sp-88',
          currentStage: 'approve',
          status: 'approved',
          authorName: 'Ahmed Al-Mansoor',
          reviewerName: 'Sarah Jenkins',
          approverName: 'Workspace Director',
          comments: 'Reviewed financial terms and approved prize allocation',
          history: [
            {
              fromStage: 'draft',
              toStage: 'review',
              action: 'submit',
              actorName: 'Ahmed Al-Mansoor',
              comment: 'Drafted sponsorship proposal',
              timestamp: new Date(
                Date.now() - 1000 * 60 * 60 * 36,
              ).toISOString(),
            },
            {
              fromStage: 'review',
              toStage: 'approve',
              action: 'approve',
              actorName: 'Sarah Jenkins',
              comment: 'Verified brand guidelines',
              timestamp: new Date(
                Date.now() - 1000 * 60 * 60 * 12,
              ).toISOString(),
            },
          ],
        });

        await this.workflowsRepo.save(wf1);
        await this.workflowsRepo.save(wf2);
      }
    } catch {
      // Memory fallback if table initializing
    }
  }

  async listWorkflows(
    workspaceId: string,
    userId?: string,
  ): Promise<WorkflowItem[]> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }
    try {
      const entities = await this.workflowsRepo.find({
        where: [{ workspaceId }, { workspaceId: 'default-ws' }],
        order: { createdAt: 'DESC' },
      });
      return entities.map((e) => this.mapWorkflowEntity(e));
    } catch {
      return (
        this.inMemoryWorkflows.get(workspaceId) ||
        this.inMemoryWorkflows.get('default-ws') ||
        []
      );
    }
  }

  async createWorkflow(
    workspaceId: string,
    payload: {
      module: WorkflowModuleType;
      itemName: string;
      itemRefId: string;
      authorName?: string;
      reviewerName?: string;
      approverName?: string;
    },
    userId?: string,
  ): Promise<WorkflowItem> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    try {
      const newEntity = this.workflowsRepo.create({
        workspaceId,
        module: payload.module,
        itemName: payload.itemName,
        itemRefId: payload.itemRefId,
        currentStage: 'draft',
        status: 'pending',
        authorName: payload.authorName || 'Workspace Creator',
        reviewerName: payload.reviewerName || 'Senior Reviewer',
        approverName: payload.approverName || 'Workspace Admin',
        history: [
          {
            fromStage: 'draft',
            toStage: 'draft',
            action: 'submit',
            actorName: payload.authorName || 'Workspace Creator',
            comment: 'Workflow initialized in Draft state',
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const saved = await this.workflowsRepo.save(newEntity);
      return this.mapWorkflowEntity(saved);
    } catch {
      const currentList = this.inMemoryWorkflows.get(workspaceId) || [];
      const newWorkflow: WorkflowItem = {
        id: `wf-${Date.now()}`,
        workspaceId,
        module: payload.module,
        itemName: payload.itemName,
        itemRefId: payload.itemRefId,
        currentStage: 'draft',
        status: 'pending',
        authorName: payload.authorName || 'Workspace Creator',
        reviewerName: payload.reviewerName || 'Senior Reviewer',
        approverName: payload.approverName || 'Workspace Admin',
        history: [
          {
            fromStage: 'draft',
            toStage: 'draft',
            action: 'submit',
            actorName: payload.authorName || 'Workspace Creator',
            comment: 'Workflow initialized in Draft state',
            timestamp: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
      };
      this.inMemoryWorkflows.set(workspaceId, [newWorkflow, ...currentList]);
      return newWorkflow;
    }
  }

  async transitionWorkflow(
    workspaceId: string,
    id: string,
    action: 'submit' | 'approve' | 'reject' | 'publish',
    actorName: string,
    comment?: string,
    userId?: string,
  ): Promise<WorkflowItem> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    try {
      const entity = await this.workflowsRepo.findOne({ where: { id } });
      if (entity) {
        const prevStage = entity.currentStage;
        let nextStage: WorkflowStage = entity.currentStage;
        let nextStatus: WorkflowStatus = entity.status;

        if (action === 'submit') {
          nextStage = 'review';
          nextStatus = 'in_review';
        } else if (action === 'approve') {
          if (entity.currentStage === 'review') {
            nextStage = 'approve';
            nextStatus = 'approved';
          } else if (entity.currentStage === 'approve') {
            nextStage = 'publish';
            nextStatus = 'published';
          }
        } else if (action === 'reject') {
          nextStage = 'draft';
          nextStatus = 'rejected';
        } else if (action === 'publish') {
          nextStage = 'publish';
          nextStatus = 'published';
        }

        entity.currentStage = nextStage;
        entity.status = nextStatus;
        if (comment) entity.comments = comment;

        const currentHistory = entity.history || [];
        entity.history = [
          {
            fromStage: prevStage,
            toStage: nextStage,
            action,
            actorName: actorName || 'Workspace User',
            comment,
            timestamp: new Date().toISOString(),
          },
          ...currentHistory,
        ];

        const updated = await this.workflowsRepo.save(entity);
        return this.mapWorkflowEntity(updated);
      }
    } catch {
      // Memory fallback
    }

    const list =
      this.inMemoryWorkflows.get(workspaceId) ||
      this.inMemoryWorkflows.get('default-ws') ||
      [];
    const item = list.find((w) => w.id === id);
    if (!item) throw new NotFoundException(`Workflow item "${id}" not found`);

    const prevStage = item.currentStage;
    let nextStage: WorkflowStage = item.currentStage;
    let nextStatus: WorkflowStatus = item.status;

    if (action === 'submit') {
      nextStage = 'review';
      nextStatus = 'in_review';
    } else if (action === 'approve') {
      if (item.currentStage === 'review') {
        nextStage = 'approve';
        nextStatus = 'approved';
      } else if (item.currentStage === 'approve') {
        nextStage = 'publish';
        nextStatus = 'published';
      }
    } else if (action === 'reject') {
      nextStage = 'draft';
      nextStatus = 'rejected';
    } else if (action === 'publish') {
      nextStage = 'publish';
      nextStatus = 'published';
    }

    item.currentStage = nextStage;
    item.status = nextStatus;
    if (comment) item.comments = comment;

    item.history.unshift({
      fromStage: prevStage,
      toStage: nextStage,
      action,
      actorName: actorName || 'Workspace User',
      comment,
      timestamp: new Date().toISOString(),
    });

    this.inMemoryWorkflows.set(workspaceId, list);
    return item;
  }

  private mapWorkflowEntity(e: WorkflowItemEntity): WorkflowItem {
    return {
      id: e.id,
      workspaceId: e.workspaceId,
      module: e.module,
      itemName: e.itemName,
      itemRefId: e.itemRefId,
      currentStage: e.currentStage,
      status: e.status,
      authorName: e.authorName,
      reviewerName: e.reviewerName,
      approverName: e.approverName,
      comments: e.comments || undefined,
      history: e.history || [],
      createdAt: e.createdAt
        ? e.createdAt.toISOString()
        : new Date().toISOString(),
    };
  }
}
