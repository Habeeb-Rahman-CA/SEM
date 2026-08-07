import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserNotificationPreferenceEntity } from './entities/user-notification-preference.entity';

@Injectable()
export class UserPreferencesService {
  constructor(
    @InjectRepository(UserNotificationPreferenceEntity)
    private prefRepo: Repository<UserNotificationPreferenceEntity>,
  ) {}

  async getPreferences(userId: string, workspaceId?: string) {
    let pref = await this.prefRepo.findOne({ where: { userId } });
    if (!pref) {
      pref = this.prefRepo.create({
        userId,
        workspaceId,
        desktopNotifications: true,
        browserNotifications: true,
        pushNotifications: true,
        emailNotifications: false,
        mentionOnly: false,
        mutedChannelIds: [],
        mutedUserIds: [],
      });
      pref = await this.prefRepo.save(pref);
    }
    return pref;
  }

  async updatePreferences(
    userId: string,
    data: Partial<UserNotificationPreferenceEntity>,
  ) {
    let pref = await this.prefRepo.findOne({ where: { userId } });
    if (!pref) {
      pref = this.prefRepo.create({ userId, ...data });
    } else {
      Object.assign(pref, data);
    }
    return await this.prefRepo.save(pref);
  }
}
