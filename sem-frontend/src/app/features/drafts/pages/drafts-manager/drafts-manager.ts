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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DraftFormType, DraftItem, FrontendDraftService } from '../../services/draft.service';
import { UiService } from '../../../../core/services/ui.service';

@Component({
  selector: 'app-drafts-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './drafts-manager.html',
})
export class DraftsManagerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private draftService = inject(FrontendDraftService);
  private ui = inject(UiService);

  workspaceId = signal<string>('');
  drafts = signal<DraftItem[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Resume Draft Modal State
  selectedDraft = signal<DraftItem | null>(null);
  resumeModalOpen = signal<boolean>(false);

  searchQuery = signal('');
  typeFilter = signal<DraftFormType | 'all'>('all');

  filteredDrafts = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const type = this.typeFilter();

    return this.drafts().filter((d) => {
      if (q && !d.title.toLowerCase().includes(q) && !d.updatedBy.toLowerCase().includes(q)) {
        return false;
      }
      if (type !== 'all' && d.formType !== type) return false;
      return true;
    });
  });

  counts = computed(() => {
    const list = this.drafts();
    return {
      total: list.length,
      events: list.filter((d) => d.formType === 'event_creation').length,
      teams: list.filter((d) => d.formType === 'team_registration').length,
      reports: list.filter((d) => d.formType === 'analytics_report').length,
    };
  });

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
    this.draftService.list(this.workspaceId()).subscribe({
      next: (list) => {
        this.drafts.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load saved drafts');
        this.isLoading.set(false);
      },
    });
  }

  openResumeModal(draft: DraftItem) {
    this.selectedDraft.set(draft);
    this.resumeModalOpen.set(true);
  }

  closeResumeModal() {
    this.selectedDraft.set(null);
    this.resumeModalOpen.set(false);
  }

  confirmResume() {
    const draft = this.selectedDraft();
    if (!draft) return;

    this.ui.success(`Resumed draft "${draft.title}"! Form pre-filled with saved progress.`);
    this.closeResumeModal();

    // Navigate to target section based on draft form type
    switch (draft.formType) {
      case 'event_creation':
        this.router.navigate(['/events']);
        break;
      case 'team_registration':
        this.router.navigate(['/teams']);
        break;
      case 'analytics_report':
        this.router.navigate(['/workspaces', this.workspaceId(), 'analytics']);
        break;
      default:
        this.router.navigate(['/workspaces', this.workspaceId()]);
        break;
    }
  }

  discardDraft(draft: DraftItem) {
    this.ui
      .confirm({
        title: 'Discard Saved Draft?',
        message: `Are you sure you want to discard "${draft.title}"? Unsaved form progress will be permanently lost.`,
        confirmText: 'Discard Draft',
        type: 'danger',
      })
      .then((confirmed) => {
        if (confirmed) {
          this.draftService.delete(this.workspaceId(), draft.id).subscribe({
            next: () => {
              this.drafts.update((list) => list.filter((d) => d.id !== draft.id));
              this.ui.info(`Discarded draft "${draft.title}".`);
            },
            error: (err) => {
              this.ui.error(err?.error?.message ?? 'Failed to discard draft');
            },
          });
        }
      });
  }

  createNewDraft() {
    const title = prompt('Enter draft title (e.g. Summer League Setup, Team Registration):');
    if (!title) return;

    this.draftService
      .save(this.workspaceId(), {
        title,
        formType: 'event_creation',
        progressPercent: 25,
        formData: { note: 'Newly created draft' },
      })
      .subscribe({
        next: (newDraft) => {
          this.drafts.update((list) => [newDraft, ...list]);
          this.ui.success(`Saved new draft "${title}"!`);
        },
        error: (err) => {
          this.ui.error(err?.error?.message ?? 'Failed to save draft');
        },
      });
  }

  formIcon(type: DraftFormType): string {
    return this.draftService.getFormTypeIcon(type);
  }

  formBadge(type: DraftFormType): string {
    return this.draftService.getFormTypeBadgeClass(type);
  }
}
