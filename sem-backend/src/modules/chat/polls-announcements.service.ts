import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatPollEntity } from './entities/chat-poll.entity';
import { ChatPollVoteEntity } from './entities/chat-poll-vote.entity';
import { ChatAnnouncementEntity } from './entities/chat-announcement.entity';

@Injectable()
export class PollsAnnouncementsService {
  constructor(
    @InjectRepository(ChatPollEntity)
    private pollRepo: Repository<ChatPollEntity>,
    @InjectRepository(ChatPollVoteEntity)
    private voteRepo: Repository<ChatPollVoteEntity>,
    @InjectRepository(ChatAnnouncementEntity)
    private announcementRepo: Repository<ChatAnnouncementEntity>,
  ) {}

  async createPoll(data: Partial<ChatPollEntity>) {
    const poll = this.pollRepo.create(data);
    return await this.pollRepo.save(poll);
  }

  async votePoll(pollId: string, userId: string, optionId: string) {
    const poll = await this.pollRepo.findOne({ where: { id: pollId } });
    if (!poll) throw new NotFoundException('Poll not found');

    const existingVote = await this.voteRepo.findOne({
      where: { pollId, userId },
    });
    if (!existingVote) {
      await this.voteRepo.save(
        this.voteRepo.create({ pollId, userId, optionId }),
      );
      poll.options = poll.options.map((opt) =>
        opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt,
      );
      poll.totalVotes += 1;
      return await this.pollRepo.save(poll);
    }
    return poll;
  }

  async createAnnouncement(data: Partial<ChatAnnouncementEntity>) {
    const announcement = this.announcementRepo.create(data);
    return await this.announcementRepo.save(announcement);
  }

  async acknowledgeAnnouncement(id: string, userId: string) {
    const ann = await this.announcementRepo.findOne({ where: { id } });
    if (!ann) throw new NotFoundException('Announcement not found');

    const set = new Set(ann.acknowledgedUserIds || []);
    set.add(userId);
    ann.acknowledgedUserIds = Array.from(set);
    return await this.announcementRepo.save(ann);
  }
}
