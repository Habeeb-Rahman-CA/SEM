import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StreamSession } from './entities/stream-session.entity';
import { StreamHighlight } from './entities/stream-highlight.entity';
import { StreamViewerSnapshot } from './entities/stream-viewer-snapshot.entity';
import { Match } from '../competitions/entities/match.entity';
import { StreamingService } from './streaming.service';
import {
  StreamingController,
  PublicStreamingController,
} from './streaming.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StreamSession,
      StreamHighlight,
      StreamViewerSnapshot,
      Match,
    ]),
    WorkspacesModule,
  ],
  controllers: [StreamingController, PublicStreamingController],
  providers: [StreamingService],
  exports: [StreamingService],
})
export class StreamingModule {}
