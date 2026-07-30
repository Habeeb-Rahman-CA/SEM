import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import {
  Notification,
  NotificationType,
  NOTIFICATION_ICONS,
} from '../workspaces/entities/notification.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  private async sendNotification(
    userId: string,
    type: NotificationType,
    message: string,
  ): Promise<void> {
    const notification = this.notificationRepository.create({
      userId,
      type,
      message,
      icon: NOTIFICATION_ICONS[type] || null,
      workspaceId: null,
      metadata: null,
    });
    await this.notificationRepository.save(notification);
  }

  async create(
    username: string,
    password: string,
    needsPasswordChange = false,
  ): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { username },
    });
    if (existingUser) {
      throw new ConflictException('Username is already taken');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      username,
      password: hashedPassword,
      needsPasswordChange,
    });

    const savedUser = await this.userRepository.save(user);

    // 8.1 — Welcome notification on user self-registration
    if (!needsPasswordChange) {
      await this.sendNotification(
        savedUser.id,
        NotificationType.WELCOME,
        `Welcome to SEM! Start by creating or joining a workspace.`,
      );
    }

    delete savedUser.password;
    return savedUser;
  }

  async findOneByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { username } });
  }

  async findOneById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  async update(
    id: string,
    updateData: { username?: string; avatarUrl?: string },
  ): Promise<User> {
    const user = await this.findOneById(id);
    if (!user) {
      throw new ConflictException('User not found');
    }
    if (updateData.username && updateData.username !== user.username) {
      const existingUser = await this.findOneByUsername(updateData.username);
      if (existingUser) {
        throw new ConflictException('Username is already taken');
      }
      user.username = updateData.username;
    }
    if (updateData.avatarUrl !== undefined) {
      user.avatarUrl = updateData.avatarUrl;
    }
    const savedUser = await this.userRepository.save(user);

    // 8.4 — Profile updated notification
    await this.sendNotification(
      savedUser.id,
      NotificationType.PROFILE_UPDATED,
      `Your profile has been updated.`,
    );

    delete savedUser.password;
    return savedUser;
  }

  async changePassword(
    id: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new ConflictException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      oldPassword,
      user.password || '',
    );
    if (!isPasswordValid) {
      throw new ConflictException('Invalid current password');
    }

    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(newPassword, salt);
    user.needsPasswordChange = false; // Reset warning since they changed password
    await this.userRepository.save(user);

    // 8.3 — Password changed successfully notification
    await this.sendNotification(
      user.id,
      NotificationType.PASSWORD_CHANGED,
      `Your password has been changed successfully.`,
    );
  }

  async countAll(): Promise<number> {
    return await this.userRepository.count();
  }
}
