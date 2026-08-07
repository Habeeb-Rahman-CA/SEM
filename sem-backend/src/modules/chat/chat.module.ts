import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceChannel } from './entities/workspace-channel.entity';
import { WorkspaceChannelMember } from './entities/workspace-channel-member.entity';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkspaceChannel, WorkspaceChannelMember]),
    WorkspacesModule,
  ],
  controllers: [ChannelsController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChatModule {}
