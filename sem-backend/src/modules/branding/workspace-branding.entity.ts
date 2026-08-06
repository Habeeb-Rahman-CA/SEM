import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../common/entities/auditable.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';

/**
 * One branding config per workspace. Ships in "not enabled" mode — every
 * field can be filled in, but `isEnabled=false` means the default Taisen
 * branding is used everywhere. This lets orgs prepare their look before
 * flipping the switch.
 *
 * Access is gated in the service by the workspace's active subscription
 * plan (Professional + Enterprise have `plan.customBranding=true`).
 */
@Entity('workspace_branding')
@Index('idx_branding_workspace_id', ['workspaceId'], { unique: true })
@Index('idx_branding_custom_domain', ['customDomain'])
export class WorkspaceBranding extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  /** Master switch. When false, defaults apply everywhere. */
  @Column({ name: 'is_enabled', type: 'boolean', default: false })
  isEnabled: boolean;

  // ─── Identity ─────────────────────────────────────────────────────

  @Column({ name: 'brand_name', type: 'varchar', length: 100, nullable: true })
  brandName: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  tagline: string | null;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ name: 'favicon_url', type: 'varchar', length: 500, nullable: true })
  faviconUrl: string | null;

  // ─── Colours (hex or CSS colour keywords) ─────────────────────────

  @Column({
    name: 'primary_color',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  primaryColor: string | null;

  @Column({
    name: 'secondary_color',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  secondaryColor: string | null;

  @Column({ name: 'accent_color', type: 'varchar', length: 30, nullable: true })
  accentColor: string | null;

  // ─── Custom domain ────────────────────────────────────────────────

  /** Full hostname (e.g. `sports.acmecorp.com`) — no scheme. */
  @Column({
    name: 'custom_domain',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  customDomain: string | null;

  /**
   * TXT record token users add at `_sem-verify.<domain>` to prove
   * ownership. Rotated on every domain change.
   */
  @Column({
    name: 'custom_domain_token',
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  customDomainToken: string | null;

  @Column({ name: 'custom_domain_verified', type: 'boolean', default: false })
  customDomainVerified: boolean;

  // ─── Login page ───────────────────────────────────────────────────

  @Column({
    name: 'login_message',
    type: 'text',
    nullable: true,
  })
  loginMessage: string | null;

  @Column({
    name: 'login_background_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  loginBackgroundUrl: string | null;

  // ─── Email templating ─────────────────────────────────────────────

  @Column({
    name: 'email_from_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  emailFromName: string | null;

  @Column({
    name: 'email_from_address',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  emailFromAddress: string | null;

  @Column({ name: 'email_header_html', type: 'text', nullable: true })
  emailHeaderHtml: string | null;

  @Column({ name: 'email_footer_html', type: 'text', nullable: true })
  emailFooterHtml: string | null;

  // ─── PDF / exported reports ───────────────────────────────────────

  @Column({ name: 'pdf_header_html', type: 'text', nullable: true })
  pdfHeaderHtml: string | null;

  @Column({ name: 'pdf_footer_html', type: 'text', nullable: true })
  pdfFooterHtml: string | null;

  // ─── Social ───────────────────────────────────────────────────────

  @Column({ name: 'social_links', type: 'jsonb', nullable: true })
  socialLinks: {
    website?: string | null;
    facebook?: string | null;
    twitter?: string | null;
    instagram?: string | null;
    linkedin?: string | null;
    youtube?: string | null;
  } | null;
}
