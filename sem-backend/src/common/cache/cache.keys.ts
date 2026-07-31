/**
 * Central registry of cache keys and their conventional TTLs. Every
 * cache read/write should go through a builder here so keys stay
 * consistent and invalidation targets are predictable.
 *
 * Naming convention:
 *
 *   <domain>:<scope>:<id>[:<sub>]
 *
 * e.g.  ws:abc:dashboard:overview
 *       ws:abc:leaderboard:comp:xyz
 *       public:event:xyz:standings
 *
 * Prefix helpers (…Prefix) return the parent namespace so callers can
 * bulk-invalidate every key under a workspace / event / competition.
 */

const w = (workspaceId: string) => `ws:${workspaceId}`;
const pub = 'public';

export const CacheTTL = {
  /** Very short — live scoreboards, current bidding round. */
  live: 5,
  /** Short — dashboard tiles, most workspace queries. */
  short: 60,
  /** Medium — leaderboards, rankings. */
  medium: 300,
  /** Long — permissions, roles, reference lookups. */
  long: 1800,
  /** Very long — sports/currencies/enum lookups. */
  reference: 3600,
} as const;

export const CacheKeys = {
  // ─── Dashboard ─────────────────────────────────────────────────────
  dashboardOverview: (workspaceId: string) =>
    `${w(workspaceId)}:dashboard:overview`,
  dashboardOverviewPrefix: (workspaceId: string) =>
    `${w(workspaceId)}:dashboard:`,

  // ─── Leaderboards / rankings / standings ───────────────────────────
  leaderboard: (workspaceId: string, competitionId: string, kind: string) =>
    `${w(workspaceId)}:leaderboard:${competitionId}:${kind}`,
  standings: (workspaceId: string, competitionId: string) =>
    `${w(workspaceId)}:standings:${competitionId}`,
  competitionRankings: (workspaceId: string, competitionId: string) =>
    `${w(workspaceId)}:rankings:${competitionId}`,
  rankingsPrefix: (workspaceId: string) => `${w(workspaceId)}:rankings:`,

  // ─── Public event data ─────────────────────────────────────────────
  publicEvent: (eventId: string) => `${pub}:event:${eventId}`,
  publicEventList: () => `${pub}:events:list`,
  publicMatchDetail: (matchId: string) => `${pub}:match:${matchId}`,
  publicLiveMatches: () => `${pub}:matches:live`,
  publicStandings: (competitionId: string) =>
    `${pub}:standings:${competitionId}`,
  publicPrefix: () => `${pub}:`,

  // ─── Permissions ───────────────────────────────────────────────────
  memberPermissions: (workspaceId: string, userId: string) =>
    `${w(workspaceId)}:perms:${userId}`,
  memberPermissionsPrefix: (workspaceId: string) => `${w(workspaceId)}:perms:`,
  workspaceRoles: (workspaceId: string) => `${w(workspaceId)}:roles`,
  workspaceMembers: (workspaceId: string) => `${w(workspaceId)}:members`,

  // ─── Lookups / reference data ──────────────────────────────────────
  sports: () => `lookup:sports`,
  referenceData: () => `lookup:reference-data`,

  // ─── Auction / finance summaries (short-lived aggregations) ────────
  auctionSummary: (workspaceId: string) => `${w(workspaceId)}:auctions:summary`,
  financeSummary: (workspaceId: string, season?: string) =>
    `${w(workspaceId)}:finance:summary:${season ?? 'all'}`,

  // ─── Workspace-wide invalidation ───────────────────────────────────
  workspacePrefix: (workspaceId: string) => `${w(workspaceId)}:`,
} as const;
