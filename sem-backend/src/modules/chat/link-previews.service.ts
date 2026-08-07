import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LinkPreviewCacheEntity } from './entities/link-preview-cache.entity';

@Injectable()
export class LinkPreviewsService {
  constructor(
    @InjectRepository(LinkPreviewCacheEntity)
    private previewRepo: Repository<LinkPreviewCacheEntity>,
  ) {}

  async getPreview(url: string) {
    let preview = await this.previewRepo.findOne({ where: { url } });
    if (!preview) {
      // Seed cached link preview for workspace link cards
      try {
        const domain = new URL(url).hostname;
        preview = this.previewRepo.create({
          url,
          title: `Resource Preview for ${domain}`,
          description: `Official documentation, media preview, and live workspace assets from ${domain}.`,
          siteName: domain,
          faviconUrl: `https://${domain}/favicon.ico`,
        });
        preview = await this.previewRepo.save(preview);
      } catch {
        preview = this.previewRepo.create({
          url,
          title: 'Shared Link Preview',
          description: 'Official workspace resource reference.',
          siteName: 'External Resource',
        });
        preview = await this.previewRepo.save(preview);
      }
    }
    return preview;
  }
}
