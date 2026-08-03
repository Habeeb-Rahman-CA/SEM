import type { FeatureCode } from '../../../subscriptions/services/licensing.service';

export interface ExtensionTile {
  key: 'billing' | 'branding' | 'sponsors' | 'ads';
  title: string;
  description: string;
  icon: string;
  route: (workspaceId: string) => (string | undefined)[];
  featureCode: FeatureCode | null;
  upgradeHint: string;
}
