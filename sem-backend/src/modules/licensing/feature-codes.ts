/**
 * Centralised catalog of every gate-able feature on the platform.
 *
 * Adding a new gate is a one-line change here: register the code, wire
 * it to the plan-limit key that governs it, and every downstream service
 * (backend + frontend) picks it up automatically via the entitlements
 * endpoint.
 *
 * Feature codes are the *public API* of the licensing system — never
 * rename one without a migration, and never inline them at call-sites
 * (import from this file instead).
 */
export const FEATURE_CODES = {
  publicPortal: 'publicPortal',
  liveScoring: 'liveScoring',
  customBranding: 'customBranding',
  apiAccess: 'apiAccess',
  prioritySupport: 'prioritySupport',
  reportsAdvanced: 'reportsAdvanced',
  sponsorsEnabled: 'sponsorsEnabled',
  adsEnabled: 'adsEnabled',
} as const;

export type FeatureCode = (typeof FEATURE_CODES)[keyof typeof FEATURE_CODES];

/**
 * Feature descriptor — how a feature maps onto the subscription plan
 * `limits` shape (from SubscriptionPlan.limits, seeded by
 * SubscriptionsService).
 *
 * Some features are boolean flags on the plan (e.g. `customBranding`);
 * others aren't in the plan schema and default to `true` for everyone
 * because we always ship them (e.g. `sponsorsEnabled`). The registry is
 * the single place to change that default without touching every gate.
 */
export interface FeatureDescriptor {
  code: FeatureCode;
  displayName: string;
  description: string;
  /**
   * Key on `SubscriptionPlan.limits` this feature maps to. When null,
   * the feature is always granted unless a per-workspace override says
   * otherwise.
   */
  planKey:
    | 'customBranding'
    | 'apiAccess'
    | 'prioritySupport'
    | 'publicPortal'
    | 'liveScoring'
    | 'reportsAdvanced'
    | null;
  /**
   * When `planKey` is `null`, this is the default entitlement everyone
   * gets. Overrides can still flip it per workspace.
   */
  defaultWhenUnkeyed: boolean;
}

export const FEATURE_REGISTRY: Record<FeatureCode, FeatureDescriptor> = {
  publicPortal: {
    code: 'publicPortal',
    displayName: 'Public event portal',
    description: 'Public spectator pages, portal listing, and live hub.',
    planKey: 'publicPortal',
    defaultWhenUnkeyed: true,
  },
  liveScoring: {
    code: 'liveScoring',
    displayName: 'Live scoring',
    description: 'Real-time scoring consoles + live scoreboard streaming.',
    planKey: 'liveScoring',
    defaultWhenUnkeyed: true,
  },
  customBranding: {
    code: 'customBranding',
    displayName: 'White-label branding',
    description: 'Custom logo, colours, domain, email + PDF templates.',
    planKey: 'customBranding',
    defaultWhenUnkeyed: false,
  },
  apiAccess: {
    code: 'apiAccess',
    displayName: 'API access',
    description: 'Programmatic access via API tokens.',
    planKey: 'apiAccess',
    defaultWhenUnkeyed: false,
  },
  prioritySupport: {
    code: 'prioritySupport',
    displayName: 'Priority support',
    description: 'Dedicated support channel with faster SLAs.',
    planKey: 'prioritySupport',
    defaultWhenUnkeyed: false,
  },
  reportsAdvanced: {
    code: 'reportsAdvanced',
    displayName: 'Advanced reports',
    description: 'Player heatmaps, custom exports, per-player deep dives.',
    // Plan stores this as a `reportsLevel` string — the licensing check
    // maps 'advanced' → true, 'standard'/'basic' → false.
    planKey: null,
    defaultWhenUnkeyed: false,
  },
  sponsorsEnabled: {
    code: 'sponsorsEnabled',
    displayName: 'Sponsor management',
    description:
      'Optional extension — workspace sponsor catalog + per-event attachments.',
    planKey: null,
    defaultWhenUnkeyed: true,
  },
  adsEnabled: {
    code: 'adsEnabled',
    displayName: 'Advertisement management',
    description: 'Optional extension — banner ads with rotation + tracking.',
    planKey: null,
    defaultWhenUnkeyed: true,
  },
};

/**
 * Quota codes — numeric limits from `SubscriptionPlan.limits`. Kept
 * separate from feature booleans because the check flow differs (delta,
 * current usage, `-1 = unlimited` sentinel).
 */
export type QuotaCode =
  'workspaces' | 'membersPerWorkspace' | 'eventsPerWorkspace' | 'storageMb';
