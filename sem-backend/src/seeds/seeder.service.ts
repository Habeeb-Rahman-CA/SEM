import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Entities
import { Sport } from '../modules/workspaces/entities/sport.entity';
import { Permission } from '../modules/workspaces/entities/permission.entity';
import { Role } from '../modules/workspaces/entities/role.entity';
import { EventChannelPresetEntity } from '../modules/chat/entities/event-channel-preset.entity';
import { WorkspaceFileRepositoryFolder } from '../modules/chat/entities/workspace-file-repository-folder.entity';
import { ScheduledChatMessageEntity } from '../modules/chat/entities/scheduled-chat-message.entity';
import { PlayerProfileEntity } from '../modules/chat/entities/player-profile.entity';
import { MatchFixtureEntity } from '../modules/chat/entities/match-fixture.entity';
import { LinkPreviewCacheEntity } from '../modules/chat/entities/link-preview-cache.entity';

// Master Data Seeds
import {
  DEFAULT_SPORTS_SEED,
  DEFAULT_PERMISSIONS_SEED,
  DEFAULT_ROLES_SEED,
  ROLE_PERMISSION_MAPPING_SEED,
} from '../modules/workspaces/data';

import {
  DEFAULT_EVENT_PRESETS_SEED,
  DEFAULT_WORKSPACE_FOLDERS_SEED,
  DEFAULT_SCHEDULED_MESSAGES_SEED,
  DEFAULT_PLAYER_PROFILE_SEED,
  DEFAULT_MATCH_FIXTURE_SEED,
  buildLinkPreviewSeed,
} from '../modules/chat/data';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(Sport)
    private readonly sportRepo: Repository<Sport>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(EventChannelPresetEntity)
    private readonly presetRepo: Repository<EventChannelPresetEntity>,
    @InjectRepository(WorkspaceFileRepositoryFolder)
    private readonly folderRepo: Repository<WorkspaceFileRepositoryFolder>,
    @InjectRepository(ScheduledChatMessageEntity)
    private readonly scheduledRepo: Repository<ScheduledChatMessageEntity>,
    @InjectRepository(PlayerProfileEntity)
    private readonly playerRepo: Repository<PlayerProfileEntity>,
    @InjectRepository(MatchFixtureEntity)
    private readonly matchRepo: Repository<MatchFixtureEntity>,
    @InjectRepository(LinkPreviewCacheEntity)
    private readonly previewRepo: Repository<LinkPreviewCacheEntity>,
  ) {}

  async seedAll() {
    this.logger.log('🚀 Starting Comprehensive System Database Seeding...');

    await this.seedSports();
    await this.seedPermissionsAndRoles();
    await this.seedEventPresets();
    await this.seedFileRepositoryFolders();
    await this.seedMatchFixtures();
    await this.seedPlayerProfiles();
    await this.seedScheduledMessages();
    await this.seedLinkPreviews();

    this.logger.log('✨ All Master Database Entities & Seeds Populated!');
  }

  async seedSports() {
    this.logger.log('Seeding Sports Catalog...');
    for (const s of DEFAULT_SPORTS_SEED) {
      const existing = await this.sportRepo.findOne({
        where: { code: s.code },
      });
      if (!existing) {
        await this.sportRepo.save(this.sportRepo.create(s));
      }
    }
  }

  async seedPermissionsAndRoles() {
    this.logger.log('Seeding System Permissions & Roles...');
    const seededPermissions: Record<string, Permission> = {};
    for (const p of DEFAULT_PERMISSIONS_SEED) {
      let existing = await this.permissionRepo.findOne({
        where: { slug: p.slug },
      });
      if (!existing) {
        existing = await this.permissionRepo.save(
          this.permissionRepo.create(p),
        );
      }
      seededPermissions[p.slug] = existing;
    }

    for (const r of DEFAULT_ROLES_SEED) {
      let existing = await this.roleRepo.findOne({
        where: { slug: r.slug, isSystem: true },
        relations: { permissions: true },
      });
      if (!existing) {
        existing = await this.roleRepo.save(this.roleRepo.create(r));
        existing.permissions = [];
      }

      const requiredSlugs = ROLE_PERMISSION_MAPPING_SEED[r.slug] || [];
      const currentSlugs = existing.permissions?.map((p) => p.slug) || [];
      const needsUpdate =
        requiredSlugs.some((slug) => !currentSlugs.includes(slug)) ||
        currentSlugs.some((slug) => !requiredSlugs.includes(slug));

      if (needsUpdate || !existing.permissions) {
        existing.permissions = requiredSlugs
          .map((slug) => seededPermissions[slug])
          .filter(Boolean);
        await this.roleRepo.save(existing);
      }
    }
  }

  async seedEventPresets() {
    this.logger.log('Seeding Event Channel Presets...');
    const count = await this.presetRepo.count();
    if (count === 0) {
      await this.presetRepo.save(
        this.presetRepo.create(DEFAULT_EVENT_PRESETS_SEED),
      );
    }
  }

  async seedFileRepositoryFolders() {
    this.logger.log('Seeding Default Workspace File Repository Folders...');
    const count = await this.folderRepo.count({
      where: { workspaceId: 'system-default' },
    });
    if (count === 0) {
      const defaults = DEFAULT_WORKSPACE_FOLDERS_SEED.map((f) => ({
        workspaceId: 'system-default',
        ...f,
      }));
      await this.folderRepo.save(this.folderRepo.create(defaults));
    }
  }

  async seedMatchFixtures() {
    this.logger.log('Seeding Match Fixtures Telemetry...');
    const existing = await this.matchRepo.findOne({
      where: { matchId: 'match-101' },
    });
    if (!existing) {
      await this.matchRepo.save(
        this.matchRepo.create({
          matchId: 'match-101',
          workspaceId: 'system-default',
          ...DEFAULT_MATCH_FIXTURE_SEED,
        }),
      );
    }
  }

  async seedPlayerProfiles() {
    this.logger.log('Seeding Player Profile Telemetry...');
    const existing = await this.playerRepo.findOne({
      where: { handle: 'alex.morgan' },
    });
    if (!existing) {
      await this.playerRepo.save(
        this.playerRepo.create({
          handle: 'alex.morgan',
          name: 'Alex Morgan',
          ...DEFAULT_PLAYER_PROFILE_SEED,
        }),
      );
    }
  }

  async seedScheduledMessages() {
    this.logger.log('Seeding Scheduled Message Queue...');
    const count = await this.scheduledRepo.count({
      where: { workspaceId: 'system-default' },
    });
    if (count === 0) {
      const defaults = DEFAULT_SCHEDULED_MESSAGES_SEED.map((s) => ({
        workspaceId: 'system-default',
        senderId: 'system-admin',
        senderName: s.senderName,
        content: s.content,
        scheduledFor: new Date(Date.now() + s.offsetMs),
        status: 'pending' as const,
      }));
      await this.scheduledRepo.save(this.scheduledRepo.create(defaults));
    }
  }

  async seedLinkPreviews() {
    this.logger.log('Seeding Link Preview Metadata Cache...');
    const url = 'https://taisen.sports/docs';
    const existing = await this.previewRepo.findOne({ where: { url } });
    if (!existing) {
      const seed = buildLinkPreviewSeed(url);
      await this.previewRepo.save(this.previewRepo.create(seed));
    }
  }
}
