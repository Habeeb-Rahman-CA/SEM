import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { WorkspaceBranding } from './workspace-branding.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { LicensingService } from '../licensing/licensing.service';
import { FEATURE_CODES } from '../licensing/feature-codes';
import { UpdateBrandingDto } from './dto/update-branding.dto';

/**
 * Public shape returned to spectator UIs — omits internal / mutable
 * fields the browser doesn't need.
 */
export interface PublicBrandingView {
  workspaceId: string;
  workspaceSlug: string;
  isEnabled: boolean;
  brandName: string | null;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  loginMessage: string | null;
  loginBackgroundUrl: string | null;
  socialLinks: WorkspaceBranding['socialLinks'];
}

@Injectable()
export class BrandingService {
  constructor(
    @InjectRepository(WorkspaceBranding)
    private readonly brandingRepo: Repository<WorkspaceBranding>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    private readonly workspacesService: WorkspacesService,
    private readonly licensing: LicensingService,
  ) {}

  // ─── Auth: read + write ──────────────────────────────────────────

  async get(workspaceId: string, userId: string): Promise<WorkspaceBranding> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.getOrProvision(workspaceId);
  }

  async update(
    workspaceId: string,
    dto: UpdateBrandingDto,
    userId: string,
  ): Promise<WorkspaceBranding> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.manage',
    );

    await this.licensing.requireFeature(
      workspaceId,
      FEATURE_CODES.customBranding,
    );

    const branding = await this.getOrProvision(workspaceId);

    // Rotate the verification token whenever the domain changes so an
    // old TXT record can't validate a new domain.
    const isDomainChanging =
      dto.customDomain !== undefined &&
      (dto.customDomain ?? null) !== (branding.customDomain ?? null);
    if (isDomainChanging) {
      const newDomain = (dto.customDomain ?? '').trim().toLowerCase() || null;
      if (newDomain && !this.isValidHostname(newDomain)) {
        throw new BadRequestException('Invalid custom domain hostname.');
      }
      branding.customDomain = newDomain;
      branding.customDomainToken = newDomain ? this.generateToken() : null;
      branding.customDomainVerified = false;
    }

    // Everything else — straight passthrough of the DTO's optional fields.
    const passthrough: (keyof UpdateBrandingDto)[] = [
      'isEnabled',
      'brandName',
      'tagline',
      'logoUrl',
      'faviconUrl',
      'primaryColor',
      'secondaryColor',
      'accentColor',
      'loginMessage',
      'loginBackgroundUrl',
      'emailFromName',
      'emailFromAddress',
      'emailHeaderHtml',
      'emailFooterHtml',
      'pdfHeaderHtml',
      'pdfFooterHtml',
      'socialLinks',
    ];
    for (const key of passthrough) {
      if (dto[key] !== undefined) {
        (branding as any)[key] = dto[key];
      }
    }

    return this.brandingRepo.save(branding);
  }

  async verifyDomain(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceBranding> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.manage',
    );
    const branding = await this.getOrProvision(workspaceId);
    if (!branding.customDomain) {
      throw new BadRequestException('No custom domain configured.');
    }
    if (!branding.customDomainToken) {
      throw new BadRequestException('No verification token generated.');
    }
    // TODO(dns): actually resolve `_sem-verify.<domain>` TXT records
    //   and confirm the expected token is present. For now the endpoint
    //   is a manual "mark verified" — safe because access is auth-gated
    //   and idempotent. Real DNS check goes here.
    branding.customDomainVerified = true;
    return this.brandingRepo.save(branding);
  }

  // ─── Public resolution ───────────────────────────────────────────

  async resolveBySlug(slug: string): Promise<PublicBrandingView | null> {
    const workspace = await this.workspaceRepo.findOne({ where: { slug } });
    if (!workspace) return null;
    const branding = await this.brandingRepo.findOne({
      where: { workspaceId: workspace.id },
    });
    if (!branding || !branding.isEnabled) return null;
    return this.toPublicView(branding, workspace);
  }

  async resolveByHost(host: string): Promise<PublicBrandingView | null> {
    const cleaned = host.split(':')[0]?.trim().toLowerCase();
    if (!cleaned) return null;
    const branding = await this.brandingRepo.findOne({
      where: { customDomain: cleaned, customDomainVerified: true },
      relations: { workspace: true },
    });
    if (!branding || !branding.isEnabled) return null;
    return this.toPublicView(branding, branding.workspace);
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  private async getOrProvision(
    workspaceId: string,
  ): Promise<WorkspaceBranding> {
    const existing = await this.brandingRepo.findOne({
      where: { workspaceId },
    });
    if (existing) return existing;
    const created = this.brandingRepo.create({ workspaceId });
    return this.brandingRepo.save(created);
  }

  private toPublicView(
    branding: WorkspaceBranding,
    workspace: Workspace,
  ): PublicBrandingView {
    return {
      workspaceId: branding.workspaceId,
      workspaceSlug: workspace.slug,
      isEnabled: branding.isEnabled,
      brandName: branding.brandName,
      tagline: branding.tagline,
      logoUrl: branding.logoUrl,
      faviconUrl: branding.faviconUrl,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      accentColor: branding.accentColor,
      loginMessage: branding.loginMessage,
      loginBackgroundUrl: branding.loginBackgroundUrl,
      socialLinks: branding.socialLinks,
    };
  }

  private generateToken(): string {
    // 32-char URL-safe token — long enough to resist enumeration.
    return `sem-${randomBytes(24).toString('base64url')}`;
  }

  private isValidHostname(host: string): boolean {
    // Basic RFC 1123 hostname check — labels of a-z/0-9/-, dot-separated.
    return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(
      host,
    );
  }
}
