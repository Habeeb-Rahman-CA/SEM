import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceChannel } from './entities/workspace-channel.entity';
import { WorkspaceChannelMember } from './entities/workspace-channel-member.entity';
import { DirectMessageConversation } from './entities/direct-message-conversation.entity';
import { DirectMessageParticipant } from './entities/direct-message-participant.entity';
import { DirectMessage } from './entities/direct-message.entity';
import { GroupChat } from './entities/group-chat.entity';
import { GroupChatMember } from './entities/group-chat-member.entity';
import { GroupChatMessage } from './entities/group-chat-message.entity';
import { WorkspaceFileRepositoryFolder } from './entities/workspace-file-repository-folder.entity';
import { WorkspaceFileRepositoryItem } from './entities/workspace-file-repository-item.entity';
import { MatchDiscussionNoteEntity } from './entities/match-discussion-note.entity';

import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { DirectMessagesService } from './direct-messages.service';
import { DirectMessagesController } from './direct-messages.controller';
import { GroupChatsService } from './group-chats.service';
import { GroupChatsController } from './group-chats.controller';
import { FileRepositoryService } from './file-repository.service';
import { FileRepositoryController } from './file-repository.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkspaceChannel,
      WorkspaceChannelMember,
      DirectMessageConversation,
      DirectMessageParticipant,
      DirectMessage,
      GroupChat,
      GroupChatMember,
      GroupChatMessage,
      WorkspaceFileRepositoryFolder,
      WorkspaceFileRepositoryItem,
      MatchDiscussionNoteEntity,
    ]),
    WorkspacesModule,
  ],
  controllers: [
    ChannelsController,
    DirectMessagesController,
    GroupChatsController,
    FileRepositoryController,
  ],
  providers: [
    ChannelsService,
    DirectMessagesService,
    GroupChatsService,
    FileRepositoryService,
  ],
  exports: [
    ChannelsService,
    DirectMessagesService,
    GroupChatsService,
    FileRepositoryService,
  ],
})
export class ChatModule {}
