import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GalleryPhoto } from './entities/gallery-photo.entity';
import { Event } from '../events/entities/event.entity';
import { Competition } from '../competitions/entities/competition.entity';
import { Match } from '../competitions/entities/match.entity';
import { GalleryService } from './gallery.service';
import { GalleryController } from './gallery.controller';
import { PublicGalleryController } from './public-gallery.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GalleryPhoto, Event, Competition, Match]),
    WorkspacesModule,
    UploadModule,
  ],
  controllers: [GalleryController, PublicGalleryController],
  providers: [GalleryService],
  exports: [GalleryService],
})
export class GalleryModule {}
