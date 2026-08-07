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
import { ScheduledChatMessageEntity } from './entities/scheduled-chat-message.entity';
import { UserNotificationPreferenceEntity } from './entities/user-notification-preference.entity';
import { PlayerProfileEntity } from './entities/player-profile.entity';
import { ChatPollEntity } from './entities/chat-poll.entity';
import { ChatPollVoteEntity } from './entities/chat-poll-vote.entity';
import { ChatAnnouncementEntity } from './entities/chat-announcement.entity';
import { EventChannelPresetEntity } from './entities/event-channel-preset.entity';
import { WorkspaceChannelCategoryEntity } from './entities/workspace-channel-category.entity';
import { ChatEmojiMasterEntity } from './entities/chat-emoji-master.entity';
import { MatchFixtureEntity } from './entities/match-fixture.entity';
import { LinkPreviewCacheEntity } from './entities/link-preview-cache.entity';
import { ChatModerationAuditLogEntity } from './entities/chat-moderation-audit-log.entity';
import { ChatMutedUserEntity } from './entities/chat-muted-user.entity';
import { ChatBannedUserEntity } from './entities/chat-banned-user.entity';
import { UserE2EEKeyEntity } from './entities/user-e2ee-key.entity';
import { ChatRetentionPolicyEntity } from './entities/chat-retention-policy.entity';
import { ChatStarredMessageEntity } from './entities/chat-starred-message.entity';
import { ChatMessageReminderEntity } from './entities/chat-message-reminder.entity';
import { ChatMessageTaskEntity } from './entities/chat-message-task.entity';
import { ChatBookmarkedConversationEntity } from './entities/chat-bookmarked-conversation.entity';

import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { DirectMessagesService } from './direct-messages.service';
import { DirectMessagesController } from './direct-messages.controller';
import { GroupChatsService } from './group-chats.service';
import { GroupChatsController } from './group-chats.controller';
import { FileRepositoryService } from './file-repository.service';
import { FileRepositoryController } from './file-repository.controller';
import { ScheduledMessagesService } from './scheduled-messages.service';
import { ScheduledMessagesController } from './scheduled-messages.controller';
import { UserPreferencesService } from './user-preferences.service';
import { UserPreferencesController } from './user-preferences.controller';
import { PlayerProfilesService } from './player-profiles.service';
import { PlayerProfilesController } from './player-profiles.controller';
import { PollsAnnouncementsService } from './polls-announcements.service';
import { PollsAnnouncementsController } from './polls-announcements.controller';
import { EventPresetsService } from './event-presets.service';
import { EventPresetsController } from './event-presets.controller';
import { MatchFixturesService } from './match-fixtures.service';
import { MatchFixturesController } from './match-fixtures.controller';
import { LinkPreviewsService } from './link-previews.service';
import { LinkPreviewsController } from './link-previews.controller';
import { ChatModerationService } from './chat-moderation.service';
import { ChatModerationController } from './chat-moderation.controller';
import { ChatSecurityService } from './chat-security.service';
import { ChatSecurityController } from './chat-security.controller';
import { ChatProductivityService } from './chat-productivity.service';
import { ChatProductivityController } from './chat-productivity.controller';
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
      ScheduledChatMessageEntity,
      UserNotificationPreferenceEntity,
      PlayerProfileEntity,
      ChatPollEntity,
      ChatPollVoteEntity,
      ChatAnnouncementEntity,
      EventChannelPresetEntity,
      WorkspaceChannelCategoryEntity,
      ChatEmojiMasterEntity,
      MatchFixtureEntity,
      LinkPreviewCacheEntity,
      ChatModerationAuditLogEntity,
      ChatMutedUserEntity,
      ChatBannedUserEntity,
      UserE2EEKeyEntity,
      ChatRetentionPolicyEntity,
      ChatStarredMessageEntity,
      ChatMessageReminderEntity,
      ChatMessageTaskEntity,
      ChatBookmarkedConversationEntity,
    ]),
    WorkspacesModule,
  ],
  controllers: [
    ChannelsController,
    DirectMessagesController,
    GroupChatsController,
    FileRepositoryController,
    ScheduledMessagesController,
    UserPreferencesController,
    PlayerProfilesController,
    PollsAnnouncementsController,
    EventPresetsController,
    MatchFixturesController,
    LinkPreviewsController,
    ChatModerationController,
    ChatSecurityController,
    ChatProductivityController,
  ],
  providers: [
    ChannelsService,
    DirectMessagesService,
    GroupChatsService,
    FileRepositoryService,
    ScheduledMessagesService,
    UserPreferencesService,
    PlayerProfilesService,
    PollsAnnouncementsService,
    EventPresetsService,
    MatchFixturesService,
    LinkPreviewsService,
    ChatModerationService,
    ChatSecurityService,
    ChatProductivityService,
  ],
  exports: [
    ChannelsService,
    DirectMessagesService,
    GroupChatsService,
    FileRepositoryService,
    ScheduledMessagesService,
    UserPreferencesService,
    PlayerProfilesService,
    PollsAnnouncementsService,
    EventPresetsService,
    MatchFixturesService,
    LinkPreviewsService,
    ChatModerationService,
    ChatSecurityService,
    ChatProductivityService,
  ],
})
export class ChatModule {}
