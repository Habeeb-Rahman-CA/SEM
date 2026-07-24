// ── Shared Components ─────────────────────────────────────────────────────────
export { AvatarComponent }        from './components/avatar/avatar';
export { ButtonComponent }        from './components/button/button';
export { ModalComponent }         from './components/modal/modal';
export { CardComponent }          from './components/card/card';
export { BadgeComponent }         from './components/badge/badge';
export { StatCardComponent }      from './components/stat-card/stat-card';
export { StatusDotComponent }     from './components/status-dot/status-dot';
export { SearchInputComponent }   from './components/search-input/search-input';
export { TabBarComponent }        from './components/tab-bar/tab-bar';
export { EmptyStateComponent }    from './components/empty-state/empty-state';
export { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner';

// ── Type re-exports ───────────────────────────────────────────────────────────
export type { ButtonVariant, ButtonSize }        from './components/button/button';
export type { BadgeVariant, BadgeSize }          from './components/badge/badge';
export type { CardVariant }                      from './components/card/card';
export type { StatCardTheme }                    from './components/stat-card/stat-card';
export type { StatusDotColor }                   from './components/status-dot/status-dot';
export type { TabItem }                          from './components/tab-bar/tab-bar';

// ── Shared Pipes ──────────────────────────────────────────────────────────────
export { InitialsPipe }    from './pipes/initials.pipe';
export { AvatarColorPipe } from './pipes/avatar-color.pipe';
export { RatingColorPipe } from './pipes/rating-color.pipe';

// ── Shared Utils ──────────────────────────────────────────────────────────────
export { getSportBadgeClass, getSportIconClass, formatMatchStatusDetail, roleBadgeClass } from './utils/ui-helpers';

