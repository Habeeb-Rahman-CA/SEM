import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UserE2EEKeyEntity } from './entities/user-e2ee-key.entity';
import { ChatRetentionPolicyEntity } from './entities/chat-retention-policy.entity';
import { DirectMessage } from './entities/direct-message.entity';
import { WorkspaceFileRepositoryItem } from './entities/workspace-file-repository-item.entity';

@Injectable()
export class ChatSecurityService {
  private readonly logger = new Logger(ChatSecurityService.name);
  private userMessageHistory = new Map<string, number[]>();

  // Dangerous File Extensions Blacklist
  private readonly DANGEROUS_EXTENSIONS = [
    'exe',
    'bat',
    'cmd',
    'sh',
    'vbs',
    'js',
    'jar',
    'scr',
    'pif',
    'msi',
    'ps1',
  ];

  constructor(
    @InjectRepository(UserE2EEKeyEntity)
    private readonly e2eeKeyRepo: Repository<UserE2EEKeyEntity>,
    @InjectRepository(ChatRetentionPolicyEntity)
    private readonly retentionRepo: Repository<ChatRetentionPolicyEntity>,
    @InjectRepository(DirectMessage)
    private readonly dmRepo: Repository<DirectMessage>,
    @InjectRepository(WorkspaceFileRepositoryItem)
    private readonly fileRepo: Repository<WorkspaceFileRepositoryItem>,
  ) {}

  // 1. E2EE Key Management
  async registerUserPublicKey(
    userId: string,
    publicKey: string,
    algorithm: string = 'ECDH-P256',
  ) {
    let existing = await this.e2eeKeyRepo.findOne({ where: { userId } });
    if (!existing) {
      existing = this.e2eeKeyRepo.create({ userId, publicKey, algorithm });
    } else {
      existing.publicKey = publicKey;
      existing.algorithm = algorithm;
    }
    return await this.e2eeKeyRepo.save(existing);
  }

  async getUserPublicKey(userId: string) {
    const key = await this.e2eeKeyRepo.findOne({ where: { userId } });
    if (!key) {
      throw new BadRequestException(
        `No E2EE public key found for user ${userId}`,
      );
    }
    return key;
  }

  // 2. File Scanning
  async scanFile(fileName: string, mimeType: string, fileSize: number) {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    if (this.DANGEROUS_EXTENSIONS.includes(ext)) {
      this.logger.warn(
        `Quarantined dangerous executable file upload attempt: ${fileName}`,
      );
      throw new ForbiddenException(
        `File upload blocked: .${ext} files are prohibited for security compliance.`,
      );
    }

    if (fileSize > 50 * 1024 * 1024) {
      // 50MB limit
      throw new BadRequestException(
        'File size exceeds security maximum limit of 50MB',
      );
    }

    return {
      status: 'clean',
      scannedAt: new Date(),
      fileName,
      mimeType,
      fileSize,
    };
  }

  // 3. Anti-Spam & Rate Limiting
  checkSpamAndRateLimit(userId: string, content: string) {
    const now = Date.now();
    const timestamps = this.userMessageHistory.get(userId) || [];

    // Filter messages sent in the last 5 seconds
    const recent = timestamps.filter((t) => now - t < 5000);
    recent.push(now);
    this.userMessageHistory.set(userId, recent);

    if (recent.length > 8) {
      throw new ForbiddenException(
        'Rate limit exceeded. Please wait a few seconds before sending more messages.',
      );
    }

    // Anti-Spam Check: Capslock flooding
    if (content.length > 20) {
      const caps = content.replace(/[^A-Z]/g, '').length;
      if (caps / content.length > 0.85) {
        throw new BadRequestException(
          'Message rejected: Excessive capital letters (Spam filter).',
        );
      }
    }

    // Anti-Spam Check: Repetitive character flooding
    if (/(.)\1{12,}/.test(content)) {
      throw new BadRequestException(
        'Message rejected: Repetitive character pattern detected.',
      );
    }

    return true;
  }

  // 4. Message Retention Policy Cleanup
  async applyRetentionPolicy(workspaceId: string) {
    const policy = await this.retentionRepo.findOne({
      where: { workspaceId, channelId: undefined },
    });

    if (!policy || !policy.enabled || policy.retentionDays <= 0) {
      return {
        prunedCount: 0,
        message: 'Retention policy disabled or set to unlimited.',
      };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    const expiredDMs = await this.dmRepo.find({
      where: { workspaceId, createdAt: LessThan(cutoffDate) },
    });

    if (expiredDMs.length > 0) {
      await this.dmRepo.remove(expiredDMs);
    }

    return {
      workspaceId,
      retentionDays: policy.retentionDays,
      prunedCount: expiredDMs.length,
      cutoffDate,
    };
  }

  async getRetentionPolicy(workspaceId: string) {
    let policy = await this.retentionRepo.findOne({
      where: { workspaceId, channelId: undefined },
    });
    if (!policy) {
      policy = await this.retentionRepo.save(
        this.retentionRepo.create({
          workspaceId,
          retentionDays: 90,
          autoDeleteMedia: true,
          enabled: true,
        }),
      );
    }
    return policy;
  }

  async updateRetentionPolicy(
    workspaceId: string,
    retentionDays: number,
    autoDeleteMedia: boolean,
    enabled: boolean,
  ) {
    let policy = await this.retentionRepo.findOne({
      where: { workspaceId, channelId: undefined },
    });
    if (!policy) {
      policy = this.retentionRepo.create({ workspaceId });
    }
    policy.retentionDays = retentionDays;
    policy.autoDeleteMedia = autoDeleteMedia;
    policy.enabled = enabled;

    return await this.retentionRepo.save(policy);
  }
}
