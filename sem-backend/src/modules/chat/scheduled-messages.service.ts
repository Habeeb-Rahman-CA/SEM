import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduledChatMessageEntity } from './entities/scheduled-chat-message.entity';
import { DEFAULT_SCHEDULED_MESSAGES_SEED } from './data';

@Injectable()
export class ScheduledMessagesService {
  constructor(
    @InjectRepository(ScheduledChatMessageEntity)
    private scheduledRepo: Repository<ScheduledChatMessageEntity>,
  ) {}

  async getScheduledMessages(workspaceId: string, senderId: string) {
    const list = await this.scheduledRepo.find({
      where: { workspaceId, senderId, status: 'pending' },
      order: { scheduledFor: 'ASC' },
    });

    if (list.length === 0) {
      const defaults = DEFAULT_SCHEDULED_MESSAGES_SEED.map((seed) => ({
        workspaceId,
        senderId,
        senderName: seed.senderName,
        content: seed.content,
        scheduledFor: new Date(Date.now() + seed.offsetMs),
        status: 'pending' as const,
      }));
      return await this.scheduledRepo.save(this.scheduledRepo.create(defaults));
    }
    return list;
  }

  async createScheduledMessage(data: Partial<ScheduledChatMessageEntity>) {
    const item = this.scheduledRepo.create(data);
    return await this.scheduledRepo.save(item);
  }

  async cancelScheduledMessage(id: string) {
    const msg = await this.scheduledRepo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Scheduled message not found');
    msg.status = 'cancelled';
    return await this.scheduledRepo.save(msg);
  }
}
