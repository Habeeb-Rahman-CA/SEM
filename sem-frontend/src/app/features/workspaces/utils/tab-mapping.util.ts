import type { BottomNavTab } from '../../../layouts/bottom-nav/bottom-nav';
import type { WorkspaceTab } from '../models/workspace-tab.type';

/**
 * The bottom nav only surfaces a handful of destinations. Map the fine-grained
 * sidebar tabs down to those four buckets.
 */
export function mapTabToBottomNav(tab: WorkspaceTab): BottomNavTab {
  if (tab === 'events') return 'events';
  if (tab === 'players' || tab === 'teams') return 'players';
  // venues, reports, settings, files and everything else collapse to overview
  return 'overview';
}
