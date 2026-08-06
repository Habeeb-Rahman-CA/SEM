// ── Shared Components ─────────────────────────────────────────────────────────
export { AvatarComponent } from './components/avatar/avatar';
export { ButtonComponent } from './components/button/button';
export { ModalComponent } from './components/modal/modal';
export { CardComponent } from './components/card/card';
export { BadgeComponent } from './components/badge/badge';
export { StatCardComponent } from './components/stat-card/stat-card';
export { StatusDotComponent } from './components/status-dot/status-dot';
export { SearchInputComponent } from './components/search-input/search-input';
export { TabBarComponent } from './components/tab-bar/tab-bar';
export { EmptyStateComponent } from './components/empty-state/empty-state';
export { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner';
export { PaginatorComponent } from './components/paginator/paginator';
export { PhotoCaptureComponent } from './components/photo-capture/photo-capture';
export { QrScannerComponent } from './components/qr-scanner/qr-scanner';
export { SkeletonComponent } from './components/skeleton/skeleton';
export type { SkeletonVariant } from './components/skeleton/skeleton';
export { BulkOperationsBarComponent } from './components/bulk-operations-bar/bulk-operations-bar';
export type {
  BulkAssignOption,
  BulkStatusOption,
} from './components/bulk-operations-bar/bulk-operations-bar';
export { OfflineBannerComponent } from './components/offline-banner/offline-banner';
export { OfflineSyncModalComponent } from './components/offline-sync-modal/offline-sync-modal';
export { BackgroundJobsWidgetComponent } from './components/background-jobs-widget/background-jobs-widget';
export { BreadcrumbComponent } from './components/breadcrumb/breadcrumb';
export { AutoSaveBadgeComponent } from './components/auto-save-badge/auto-save-badge';
export { DraftRecoveryModalComponent } from './components/draft-recovery-modal/draft-recovery-modal';
export { SmartDefaultsBannerComponent } from './components/smart-defaults-banner/smart-defaults-banner';
export { AutoSaveDirective } from './directives/auto-save.directive';
export { UndoToastComponent } from './components/undo-toast/undo-toast';
export { SavedFiltersBarComponent } from './components/saved-filters-bar/saved-filters-bar';
export { VersionHistoryDrawerComponent } from './components/version-history-drawer/version-history-drawer';
export { ToastItemComponent } from './components/toast-item/toast-item';
export { CelebrationModalComponent } from './components/celebration-modal/celebration-modal';
export { CustomizableTableComponent } from './components/customizable-table/customizable-table';
export { RecordCommentsComponent } from './components/record-comments/record-comments';
export { ActivityFeedComponent } from './components/activity-feed/activity-feed';
export { CopyButtonComponent } from './components/copy-button/copy-button';
export { RecycleBinComponent } from './components/recycle-bin/recycle-bin';
export { SmartSuggestionToastComponent } from './components/smart-suggestion-toast/smart-suggestion-toast';
export { DuplicateWarningModalComponent } from './components/duplicate-warning-modal/duplicate-warning-modal';
export { HelpTooltipComponent } from './components/help-tooltip/help-tooltip';
export { FloatingActionButtonComponent } from './components/floating-action-button/floating-action-button';
export { CopyDirective } from './directives/copy.directive';
export { TippyDirective } from './directives/tippy.directive';
export { ConfettiService } from '../core/services/confetti.service';
export { RecordCommentsService } from '../core/services/record-comments.service';
export { ActivityFeedService } from '../core/services/activity-feed.service';
export { RecycleBinService } from '../core/services/recycle-bin.service';
export { SmartSuggestionsService } from '../core/services/smart-suggestions.service';
export { DuplicateDetectionService } from '../core/services/duplicate-detection.service';

// ── Type re-exports ───────────────────────────────────────────────────────────
export type { ButtonVariant, ButtonSize } from './components/button/button';
export type { BadgeVariant, BadgeSize } from './components/badge/badge';
export type { CardVariant } from './components/card/card';
export type { StatCardTheme } from './components/stat-card/stat-card';
export type { StatusDotColor } from './components/status-dot/status-dot';
export type { TabItem } from './components/tab-bar/tab-bar';
export type { PhotoUploadType, PhotoShape } from './components/photo-capture/photo-capture';

// ── Shared Directives ─────────────────────────────────────────────────────────
export { PullToRefreshDirective } from './directives/pull-to-refresh.directive';
export { LazyImgDirective } from './directives/lazy-img.directive';
export { DebounceDirective } from './directives/debounce.directive';
export { DeferVisibleDirective } from './directives/defer-visible.directive';

// ── Shared Pipes ──────────────────────────────────────────────────────────────
export { InitialsPipe } from './pipes/initials.pipe';
export { AvatarColorPipe } from './pipes/avatar-color.pipe';
export { RatingColorPipe } from './pipes/rating-color.pipe';
export { PickImageSrcPipe } from './pipes/pick-image-src.pipe';

// ── Shared Utils ──────────────────────────────────────────────────────────────
export {
  getSportBadgeClass,
  getSportIconClass,
  formatMatchStatusDetail,
  roleBadgeClass,
} from './utils/ui-helpers';
export { byId, byIndex, byField, byComposite } from './utils/track-by';
