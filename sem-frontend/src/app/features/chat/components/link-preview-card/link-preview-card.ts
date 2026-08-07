import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface LinkPreviewData {
  url: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  siteName?: string;
  faviconUrl?: string;
}

@Component({
  selector: 'app-link-preview-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './link-preview-card.html',
  styleUrls: ['./link-preview-card.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkPreviewCardComponent {
  @Input({ required: true }) preview!: LinkPreviewData;

  get domain(): string {
    if (!this.preview?.url) return '';
    try {
      const parsed = new URL(this.preview.url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return this.preview.siteName || 'External Link';
    }
  }
}
