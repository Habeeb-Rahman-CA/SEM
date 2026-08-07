import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from '../app.module';

// Entities
import { Sport } from '../modules/workspaces/entities/sport.entity';
import { Permission } from '../modules/workspaces/entities/permission.entity';
import { Role } from '../modules/workspaces/entities/role.entity';
import { EventChannelPresetEntity } from '../modules/chat/entities/event-channel-preset.entity';
import { WorkspaceFileRepositoryFolder } from '../modules/chat/entities/workspace-file-repository-folder.entity';
import { ScheduledChatMessageEntity } from '../modules/chat/entities/scheduled-chat-message.entity';
import { PlayerProfileEntity } from '../modules/chat/entities/player-profile.entity';
import { MatchFixtureEntity } from '../modules/chat/entities/match-fixture.entity';
import { LinkPreviewCacheEntity } from '../modules/chat/entities/link-preview-cache.entity';

import { SeederService } from './seeder.service';

@Module({
  imports: [
    AppModule,
    TypeOrmModule.forFeature([
      Sport,
      Permission,
      Role,
      EventChannelPresetEntity,
      WorkspaceFileRepositoryFolder,
      ScheduledChatMessageEntity,
      PlayerProfileEntity,
      MatchFixtureEntity,
      LinkPreviewCacheEntity,
    ]),
  ],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
