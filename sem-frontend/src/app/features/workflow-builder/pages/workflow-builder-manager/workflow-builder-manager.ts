import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FrontendWorkflowBuilderService,
  WorkflowItem,
  WorkflowModuleType,
  WorkflowStage,
  WorkflowStatus,
} from '../../services/workflow-builder.service';
import { UiService } from '../../../../core/services/ui.service';

@Component({
  selector: 'app-workflow-builder-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workflow-builder-manager.html',
})
export class WorkflowBuilderManagerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private workflowService = inject(FrontendWorkflowBuilderService);
  private ui = inject(UiService);

  workspaceId = signal<string>('');
  workflows = signal<WorkflowItem[]>([]);
  selectedWorkflow = signal<WorkflowItem | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Transition Comment Modal Input
  transitionCommentInput = signal('');
  actorNameInput = signal('Sarah Jenkins');

  // New Workflow Modal State
  newModalOpen = signal<boolean>(false);
  newItemName = signal('');
  newModule = signal<WorkflowModuleType>('events');
  newAuthor = signal('Sarah Jenkins');
  newReviewer = signal('Michael Scott');
  newApprover = signal('Workspace Director');

  stagesList: { id: WorkflowStage; label: string; icon: string }[] = [
    { id: 'draft', label: '1. Create / Draft', icon: 'fi fi-rr-edit' },
    { id: 'review', label: '2. Peer Review', icon: 'fi fi-rr-search' },
    { id: 'approve', label: '3. Manager Approval', icon: 'fi fi-rr-check-circle' },
    { id: 'publish', label: '4. Publish & Execute', icon: 'fi fi-rr-paper-plane' },
  ];

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      this.workspaceId.set(id);
      if (id) this.load();
    });
  }

  load() {
    this.isLoading.set(true);
    this.error.set(null);
    this.workflowService.listWorkflows(this.workspaceId()).subscribe({
      next: (list) => {
        this.workflows.set(list);
        if (list.length > 0) {
          this.selectedWorkflow.set(list[0]);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load workflow pipelines');
        this.isLoading.set(false);
      },
    });
  }

  selectWorkflow(wf: WorkflowItem) {
    this.selectedWorkflow.set(wf);
  }

  transition(action: 'submit' | 'approve' | 'reject' | 'publish') {
    const wf = this.selectedWorkflow();
    if (!wf) return;

    const comment = this.transitionCommentInput().trim();
    const actor = this.actorNameInput().trim() || 'Workspace Admin';

    this.workflowService
      .transitionWorkflow(this.workspaceId(), wf.id, action, actor, comment)
      .subscribe({
        next: (updated) => {
          this.workflows.update((list) => list.map((w) => (w.id === updated.id ? updated : w)));
          this.selectedWorkflow.set(updated);
          this.transitionCommentInput.set('');
          this.ui.success(
            `Workflow item updated to stage "${updated.currentStage.toUpperCase()}"!`,
          );
        },
        error: (err) => {
          this.ui.error(err?.error?.message ?? 'Failed to transition workflow stage');
        },
      });
  }

  openNewModal() {
    this.newModalOpen.set(true);
  }

  closeNewModal() {
    this.newModalOpen.set(false);
  }

  submitNewWorkflow() {
    const name = this.newItemName().trim();
    if (!name) {
      this.ui.error('Please enter an item name for the workflow pipeline.');
      return;
    }

    const payload = {
      module: this.newModule(),
      itemName: name,
      itemRefId: `ref-${Date.now()}`,
      authorName: this.newAuthor().trim() || 'Workspace Author',
      reviewerName: this.newReviewer().trim() || 'Senior Reviewer',
      approverName: this.newApprover().trim() || 'Workspace Director',
    };

    this.workflowService.createWorkflow(this.workspaceId(), payload).subscribe({
      next: (created) => {
        this.ui.success(`Initialized workflow pipeline for "${created.itemName}"!`);
        this.closeNewModal();
        this.newItemName.set('');
        this.load();
      },
      error: (err) => {
        this.ui.error(err?.error?.message ?? 'Failed to create workflow pipeline');
      },
    });
  }

  moduleBadge(mod: WorkflowModuleType): string {
    return this.workflowService.getModuleBadgeClass(mod);
  }

  stageBadge(stage: WorkflowStage, status: WorkflowStatus): string {
    return this.workflowService.getStageBadgeClass(stage, status);
  }

  isStageCompleted(stage: WorkflowStage, currentStage: WorkflowStage): boolean {
    const order: WorkflowStage[] = ['draft', 'review', 'approve', 'publish'];
    return order.indexOf(stage) < order.indexOf(currentStage);
  }

  isStageActive(stage: WorkflowStage, currentStage: WorkflowStage): boolean {
    return stage === currentStage;
  }
}
