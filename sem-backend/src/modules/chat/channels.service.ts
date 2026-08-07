import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  WorkspaceChannel,
  ChannelAccessType,
  ChannelPostingPermission,
} from './entities/workspace-channel.entity';
import {
  WorkspaceChannelMember,
  ChannelMemberRole,
} from './entities/workspace-channel-member.entity';
import { WorkspaceMembersService } from '../workspaces/members/members.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { AddChannelMemberDto } from './dto/add-channel-member.dto';
import { DEFAULT_CHANNELS_PRESET } from './data';

@Injectable()
export class ChannelsService {
  constructor(
    @InjectRepository(WorkspaceChannel)
    private readonly channelRepo: Repository<WorkspaceChannel>,
    @InjectRepository(WorkspaceChannelMember)
    private readonly channelMemberRepo: Repository<WorkspaceChannelMember>,
    private readonly workspaceMembersService: WorkspaceMembersService,
  ) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async ensureDefaultChannels(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceChannel[]> {
    const existingCount = await this.channelRepo.count({
      where: { workspaceId },
    });

    if (existingCount > 0) {
      return this.channelRepo.find({ where: { workspaceId } });
    }

    const createdChannels: WorkspaceChannel[] = [];
    for (const preset of DEFAULT_CHANNELS_PRESET) {
      const channel = this.channelRepo.create({
        workspaceId,
        name: preset.name,
        slug: preset.slug,
        description: preset.description,
        category: preset.category,
        icon: preset.icon,
        accessType: preset.accessType,
        postingPermission: preset.postingPermission,
        isDefault: preset.isDefault,
        createdById: userId,
      });
      const saved = await this.channelRepo.save(channel);

      // Add creator as member
      await this.channelMemberRepo.save(
        this.channelMemberRepo.create({
          channelId: saved.id,
          workspaceId,
          userId,
          role: ChannelMemberRole.ADMIN,
        }),
      );

      createdChannels.push(saved);
    }

    return createdChannels;
  }

  async listChannels(workspaceId: string, userId: string) {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);
    await this.ensureDefaultChannels(workspaceId, userId);

    const allChannels = await this.channelRepo.find({
      where: { workspaceId, isArchived: false },
      order: { isDefault: 'DESC', category: 'ASC', name: 'ASC' },
    });

    const userMemberships = await this.channelMemberRepo.find({
      where: { workspaceId, userId },
    });
    const joinedChannelIds = new Set(userMemberships.map((m) => m.channelId));
    const adminChannelIds = new Set(
      userMemberships
        .filter((m) => m.role === ChannelMemberRole.ADMIN)
        .map((m) => m.channelId),
    );

    // Get total member counts per channel
    const memberCountsRaw = await this.channelMemberRepo
      .createQueryBuilder('cm')
      .select('cm.channelId', 'channelId')
      .addSelect('COUNT(cm.id)', 'count')
      .where('cm.workspaceId = :workspaceId', { workspaceId })
      .groupBy('cm.channelId')
      .getRawMany();

    const memberCountMap = new Map<string, number>();
    for (const r of memberCountsRaw) {
      memberCountMap.set(r.channelId, parseInt(r.count, 10));
    }

    // Filter public channels + private channels user belongs to
    const accessibleChannels = allChannels.filter(
      (c) =>
        c.accessType === ChannelAccessType.PUBLIC || joinedChannelIds.has(c.id),
    );

    return accessibleChannels.map((channel) => ({
      ...channel,
      isJoined: joinedChannelIds.has(channel.id),
      isAdmin: adminChannelIds.has(channel.id),
      memberCount: memberCountMap.get(channel.id) || 0,
    }));
  }

  async createChannel(
    workspaceId: string,
    dto: CreateChannelDto,
    userId: string,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);

    const slug = this.slugify(dto.name);
    if (!slug) {
      throw new BadRequestException('Invalid channel name');
    }

    const existing = await this.channelRepo.findOne({
      where: { workspaceId, slug },
    });
    if (existing) {
      throw new ConflictException(
        `Channel with name "${dto.name}" already exists in this workspace`,
      );
    }

    const channelData = {
      workspaceId,
      name: dto.name.trim(),
      slug,
      description: dto.description || undefined,
      category: dto.category || 'custom',
      icon:
        dto.icon ||
        (dto.accessType === ChannelAccessType.PRIVATE
          ? 'fi fi-rr-lock'
          : 'fi fi-rr-hashtag'),
      accessType: dto.accessType || ChannelAccessType.PUBLIC,
      postingPermission:
        dto.postingPermission || ChannelPostingPermission.ALL_MEMBERS,
      isDefault: false,
      createdById: userId,
    };

    const channel = this.channelRepo.create(channelData);

    const saved = await this.channelRepo.save(channel);

    // Add creator as Channel Admin
    await this.channelMemberRepo.save(
      this.channelMemberRepo.create({
        channelId: saved.id,
        workspaceId,
        userId,
        role: ChannelMemberRole.ADMIN,
      }),
    );

    // Add initial members if specified
    if (dto.initialMemberUserIds && dto.initialMemberUserIds.length > 0) {
      for (const mId of dto.initialMemberUserIds) {
        if (mId !== userId) {
          await this.channelMemberRepo.save(
            this.channelMemberRepo.create({
              channelId: saved.id,
              workspaceId,
              userId: mId,
              role: ChannelMemberRole.MEMBER,
            }),
          );
        }
      }
    }

    return {
      ...saved,
      isJoined: true,
      isAdmin: true,
      memberCount: 1 + (dto.initialMemberUserIds?.length || 0),
    };
  }

  async getChannel(workspaceId: string, channelId: string, userId: string) {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);

    const channel = await this.channelRepo.findOne({
      where: { id: channelId, workspaceId },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const membership = await this.channelMemberRepo.findOne({
      where: { channelId, userId },
    });

    if (channel.accessType === ChannelAccessType.PRIVATE && !membership) {
      throw new ForbiddenException(
        'You do not have access to this private channel',
      );
    }

    const members = await this.channelMemberRepo.find({
      where: { channelId },
      relations: { user: true },
      order: { joinedAt: 'ASC' },
    });

    return {
      ...channel,
      isJoined: !!membership,
      isAdmin: membership?.role === ChannelMemberRole.ADMIN,
      memberCount: members.length,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        username: m.user?.username,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    };
  }

  async updateChannel(
    workspaceId: string,
    channelId: string,
    dto: UpdateChannelDto,
    userId: string,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);

    const channel = await this.channelRepo.findOne({
      where: { id: channelId, workspaceId },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // Check membership & role or workspace admin
    const membership = await this.channelMemberRepo.findOne({
      where: { channelId, userId },
    });
    if (!membership || membership.role !== ChannelMemberRole.ADMIN) {
      throw new ForbiddenException(
        'Only channel admins can update channel settings',
      );
    }

    if (dto.name && dto.name.trim() !== channel.name) {
      const newSlug = this.slugify(dto.name);
      const existing = await this.channelRepo.findOne({
        where: { workspaceId, slug: newSlug },
      });
      if (existing && existing.id !== channelId) {
        throw new ConflictException(
          `Channel name "${dto.name}" is already taken`,
        );
      }
      channel.name = dto.name.trim();
      channel.slug = newSlug;
    }

    if (dto.description !== undefined) channel.description = dto.description;
    if (dto.category !== undefined) channel.category = dto.category;
    if (dto.icon !== undefined) channel.icon = dto.icon;
    if (dto.accessType !== undefined) channel.accessType = dto.accessType;
    if (dto.postingPermission !== undefined)
      channel.postingPermission = dto.postingPermission;
    if (dto.isArchived !== undefined) channel.isArchived = dto.isArchived;

    return this.channelRepo.save(channel);
  }

  async deleteChannel(workspaceId: string, channelId: string, userId: string) {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);

    const channel = await this.channelRepo.findOne({
      where: { id: channelId, workspaceId },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.isDefault) {
      throw new BadRequestException(
        'Default workspace channels cannot be deleted',
      );
    }

    const membership = await this.channelMemberRepo.findOne({
      where: { channelId, userId },
    });
    if (!membership || membership.role !== ChannelMemberRole.ADMIN) {
      throw new ForbiddenException('Only channel admins can delete channels');
    }

    await this.channelRepo.remove(channel);
    return { success: true, message: `Channel #${channel.name} deleted` };
  }

  async joinChannel(workspaceId: string, channelId: string, userId: string) {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);

    const channel = await this.channelRepo.findOne({
      where: { id: channelId, workspaceId },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.accessType === ChannelAccessType.PRIVATE) {
      throw new ForbiddenException(
        'Private channels can only be joined via invitation',
      );
    }

    let membership = await this.channelMemberRepo.findOne({
      where: { channelId, userId },
    });

    if (!membership) {
      membership = this.channelMemberRepo.create({
        channelId,
        workspaceId,
        userId,
        role: ChannelMemberRole.MEMBER,
      });
      await this.channelMemberRepo.save(membership);
    }

    return { success: true, channelId, userId };
  }

  async leaveChannel(workspaceId: string, channelId: string, userId: string) {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);

    const channel = await this.channelRepo.findOne({
      where: { id: channelId, workspaceId },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const membership = await this.channelMemberRepo.findOne({
      where: { channelId, userId },
    });
    if (membership) {
      await this.channelMemberRepo.remove(membership);
    }

    return { success: true, channelId, userId };
  }

  async addMember(
    workspaceId: string,
    channelId: string,
    dto: AddChannelMemberDto,
    requesterId: string,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, requesterId);
    await this.workspaceMembersService.ensureMember(workspaceId, dto.userId);

    const channel = await this.channelRepo.findOne({
      where: { id: channelId, workspaceId },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const reqMembership = await this.channelMemberRepo.findOne({
      where: { channelId, userId: requesterId },
    });
    if (!reqMembership && channel.accessType === ChannelAccessType.PRIVATE) {
      throw new ForbiddenException(
        'Only channel members can add people to private channels',
      );
    }

    let targetMember = await this.channelMemberRepo.findOne({
      where: { channelId, userId: dto.userId },
    });
    if (!targetMember) {
      targetMember = this.channelMemberRepo.create({
        channelId,
        workspaceId,
        userId: dto.userId,
        role: dto.role || ChannelMemberRole.MEMBER,
      });
      await this.channelMemberRepo.save(targetMember);
    }

    return targetMember;
  }

  async removeMember(
    workspaceId: string,
    channelId: string,
    targetUserId: string,
    requesterId: string,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, requesterId);

    const reqMembership = await this.channelMemberRepo.findOne({
      where: { channelId, userId: requesterId },
    });
    if (
      requesterId !== targetUserId &&
      (!reqMembership || reqMembership.role !== ChannelMemberRole.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only channel admins can remove other members',
      );
    }

    const member = await this.channelMemberRepo.findOne({
      where: { channelId, userId: targetUserId },
    });
    if (member) {
      await this.channelMemberRepo.remove(member);
    }

    return { success: true, channelId, userId: targetUserId };
  }
}
