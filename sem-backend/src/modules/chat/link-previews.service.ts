import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LinkPreviewCacheEntity } from './entities/link-preview-cache.entity';
import { buildLinkPreviewSeed } from './data';

@Injectable()
export class LinkPreviewsService {
  constructor(
    @InjectRepository(LinkPreviewCacheEntity)
    private previewRepo: Repository<LinkPreviewCacheEntity>,
  ) {}

  async getPreview(url: string) {
    let preview = await this.previewRepo.findOne({ where: { url } });
    if (!preview) {
      const seedData = buildLinkPreviewSeed(url);
      preview = this.previewRepo.create(seedData);
      preview = await this.previewRepo.save(preview);
    }
    return preview;
  }
}
