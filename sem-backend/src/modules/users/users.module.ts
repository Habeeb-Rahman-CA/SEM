import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { Notification } from '../workspaces/entities/notification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Notification])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
