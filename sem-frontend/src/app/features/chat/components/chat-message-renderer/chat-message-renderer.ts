import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { AudioPlayerComponent } from '../audio-player/audio-player';
import { LinkPreviewCardComponent, LinkPreviewData } from '../link-preview-card/link-preview-card';
import { SmartEventCardComponent, SmartMatchData } from '../smart-event-card/smart-event-card';
import {
  PlayerCardPopoverComponent,
  PlayerProfileData,
} from '../player-card-popover/player-card-popover';

@Component({
  selector: 'app-chat-message-renderer',
  standalone: true,
  imports: [
    CommonModule,
    AudioPlayerComponent,
    LinkPreviewCardComponent,
    SmartEventCardComponent,
    PlayerCardPopoverComponent,
  ],
  template: `
    <div class="rich-message-content leading-relaxed font-sans text-xs break-words">
      @if (renderedContent) {
        <div [innerHTML]="renderedContent"></div>
      }
      @if (smartMatchCard(); as match) {
        <app-smart-event-card
          [matchData]="match"
          (openDiscussion)="openMatchDiscussion.emit($event)"
        />
      }
      @if (audioSource(); as audio) {
        <div class="mt-2">
          <app-audio-player [src]="audio.url" [title]="audio.name" [size]="audio.size" />
        </div>
      }
      @if (linkPreview(); as preview) {
        <app-link-preview-card [preview]="preview" />
      }
      @if (hoveredPlayer(); as pData) {
        <app-player-card-popover [player]="pData.player" [position]="pData.pos" />
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      ::ng-deep .rich-message-content p {
        margin-bottom: 0.35rem;
      }
      ::ng-deep .rich-message-content p:last-child {
        margin-bottom: 0;
      }
      ::ng-deep .rich-message-content code.inline-code {
        background: rgba(255, 255, 255, 0.15);
        color: #f1f5f9;
        padding: 0.15rem 0.35rem;
        border-radius: 0.25rem;
        font-family: monospace;
        font-size: 0.85em;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      ::ng-deep .rich-message-content pre.code-block {
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 0.5rem;
        padding: 0.6rem 0.8rem;
        margin: 0.5rem 0;
        overflow-x: auto;
        font-family: 'Fira Code', 'Courier New', Courier, monospace;
        font-size: 0.8em;
        color: #38bdf8;
      }
      ::ng-deep .rich-message-content blockquote.quote-block {
        border-left: 3px solid #818cf8;
        background: rgba(129, 140, 248, 0.1);
        padding: 0.35rem 0.75rem;
        margin: 0.4rem 0;
        border-radius: 0 0.375rem 0.375rem 0;
        font-style: italic;
        color: #cbd5e1;
      }
      ::ng-deep .rich-message-content ul.rich-list {
        list-style-type: disc;
        padding-left: 1.25rem;
        margin: 0.4rem 0;
      }
      ::ng-deep .rich-message-content ol.rich-list-ordered {
        list-style-type: decimal;
        padding-left: 1.25rem;
        margin: 0.4rem 0;
      }
      ::ng-deep .rich-message-content table.rich-table {
        width: 100%;
        border-collapse: collapse;
        margin: 0.5rem 0;
        font-size: 0.85em;
      }
      ::ng-deep .rich-message-content table.rich-table th,
      ::ng-deep .rich-message-content table.rich-table td {
        border: 1px solid rgba(255, 255, 255, 0.15);
        padding: 0.4rem 0.6rem;
        text-align: left;
      }
      ::ng-deep .rich-message-content table.rich-table th {
        background: rgba(255, 255, 255, 0.1);
        font-weight: 600;
        color: #818cf8;
      }
      ::ng-deep .rich-message-content img.msg-gif,
      ::ng-deep .rich-message-content img.msg-sticker {
        max-width: 200px;
        max-height: 180px;
        border-radius: 0.5rem;
        display: block;
        margin: 0.35rem 0;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      ::ng-deep .rich-message-content img.msg-gif:hover,
      ::ng-deep .rich-message-content img.msg-sticker:hover,
      ::ng-deep .rich-message-content img.msg-att-img:hover {
        transform: scale(1.02);
      }
      ::ng-deep .rich-message-content img.msg-sticker {
        max-width: 120px;
        max-height: 120px;
      }

      /* MENTIONS STYLING */
      ::ng-deep .rich-message-content .mention-tag {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.1rem 0.45rem;
        border-radius: 0.375rem;
        font-weight: 700;
        font-size: 0.9em;
        margin: 0 0.1rem;
        vertical-align: baseline;
      }
      ::ng-deep .rich-message-content .mention-group {
        background: rgba(245, 158, 11, 0.2);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.35);
      }
      ::ng-deep .rich-message-content .mention-user {
        background: rgba(139, 92, 246, 0.25);
        color: #c4b5fd;
        border: 1px solid rgba(139, 92, 246, 0.4);
      }
      ::ng-deep .rich-message-content .mention-channel {
        background: rgba(6, 182, 212, 0.2);
        color: #67e8f9;
        border: 1px solid rgba(6, 182, 212, 0.35);
      }

      /* MEDIA ATTACHMENTS STYLING */
      ::ng-deep .rich-message-content img.msg-att-img {
        max-width: 280px;
        max-height: 240px;
        border-radius: 0.75rem;
        display: block;
        margin: 0.4rem 0;
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
        cursor: pointer;
      }
      ::ng-deep .rich-message-content video.msg-att-video {
        max-width: 320px;
        max-height: 240px;
        border-radius: 0.75rem;
        display: block;
        margin: 0.4rem 0;
        border: 1px solid rgba(255, 255, 255, 0.15);
      }
      ::ng-deep .rich-message-content audio.msg-att-audio {
        max-width: 300px;
        margin: 0.4rem 0;
        display: block;
      }
      ::ng-deep .rich-message-content .msg-att-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.6rem 0.8rem;
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 0.75rem;
        margin: 0.4rem 0;
        max-width: 320px;
      }
      ::ng-deep .rich-message-content .msg-att-card a.att-dl-btn {
        padding: 0.3rem 0.6rem;
        background: rgba(139, 92, 246, 0.2);
        border: 1px solid rgba(139, 92, 246, 0.35);
        color: #c4b5fd;
        border-radius: 0.5rem;
        font-weight: 700;
        font-size: 0.85em;
        text-decoration: none;
        transition: all 0.15s ease;
      }
      ::ng-deep .rich-message-content .msg-att-card a.att-dl-btn:hover {
        background: rgba(139, 92, 246, 0.4);
        color: #ffffff;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageRendererComponent implements OnChanges {
  @Input({ required: true }) content: string = '';
  @Output() imageClick = new EventEmitter<{ url: string; title?: string }>();
  @Output() videoClick = new EventEmitter<{ url: string; title?: string }>();
  @Output() fileDetailsClick = new EventEmitter<{ name: string; url?: string; category: string }>();
  @Output() openMatchDiscussion = new EventEmitter<SmartMatchData>();

  private sanitizer = inject(DomSanitizer);
  renderedContent: SafeHtml = '';
  audioSource = signal<{ url: string; name: string; size: string } | null>(null);
  linkPreview = signal<LinkPreviewData | null>(null);
  smartMatchCard = signal<SmartMatchData | null>(null);
  hoveredPlayer = signal<{ player: PlayerProfileData; pos: { x: number; y: number } } | null>(null);

  @HostListener('mouseover', ['$event'])
  onHostMouseOver(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target && target.classList.contains('mention-player')) {
      const handle =
        target.getAttribute('data-player-handle') || target.textContent?.replace('@', '') || '';
      const rect = target.getBoundingClientRect();

      const playerData = this.getPlayerProfileData(handle);
      this.hoveredPlayer.set({
        player: playerData,
        pos: {
          x: Math.min(rect.left, window.innerWidth - 300),
          y: rect.bottom + 8,
        },
      });
    }
  }

  @HostListener('mouseout', ['$event'])
  onHostMouseOut(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target && target.classList.contains('mention-player')) {
      this.hoveredPlayer.set(null);
    }
  }

  @HostListener('click', ['$event'])
  onHostClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target) {
      const card = target.closest('.msg-att-card') as HTMLElement;
      if (card) {
        const titleEl = card.querySelector('.font-bold');
        const fileName = titleEl ? titleEl.textContent || 'Attachment' : 'Attachment';
        const linkEl = card.querySelector('a') as HTMLAnchorElement;
        const url = linkEl ? linkEl.href : '';
        this.fileDetailsClick.emit({ name: fileName, url, category: 'file' });
        return;
      }

      if (target.tagName.toLowerCase() === 'img') {
        const imgEl = target as HTMLImageElement;
        if (imgEl.src) {
          this.imageClick.emit({ url: imgEl.src, title: imgEl.alt || 'Image Attachment' });
        }
      } else if (target.tagName.toLowerCase() === 'video') {
        const videoEl = target as HTMLVideoElement;
        if (videoEl.src) {
          event.preventDefault();
          this.videoClick.emit({ url: videoEl.src, title: 'Video Attachment' });
        }
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content']) {
      this.audioSource.set(null);
      this.linkPreview.set(null);
      this.smartMatchCard.set(null);
      this.hoveredPlayer.set(null);

      const parsedHtml = this.parseRichMessage(this.content || '');
      this.renderedContent = this.sanitizer.bypassSecurityTrustHtml(parsedHtml);
      this.extractLinkPreview(this.content || '');
      this.extractSmartMatchCard(this.content || '');
    }
  }

  private extractSmartMatchCard(rawText: string): void {
    if (!rawText) return;

    // Detect Match ID or Event ID patterns (e.g. #match-101, #event-202, MATCH-CRICK-44, EVENT-FT-88, MATCH-101)
    const matchRegex = /#?(match|event)[-_]?([a-zA-Z0-9\-]+)/i;
    const match = rawText.match(matchRegex);

    if (!match) return;

    const fullMatchId = match[0].toUpperCase().replace('#', '');
    const idKey = match[2].toLowerCase();

    if (
      idKey.includes('ft') ||
      idKey.includes('football') ||
      idKey.includes('202') ||
      idKey === '88'
    ) {
      this.smartMatchCard.set({
        matchId: fullMatchId,
        title: 'Finals: Dynamo FC vs Lightning Strikers',
        tournamentName: 'Regional Football Championship 2026',
        status: 'live',
        sportType: 'football',
        homeTeam: { name: 'Dynamo FC', code: 'DFC', score: '2' },
        awayTeam: { name: 'Lightning Strikers', code: 'LST', score: '1' },
        venue: 'Metropolitan Arena, Pitch A',
        startTime: 'Today, 7:00 PM IST',
        officials: [
          { role: 'Head Referee', name: 'Marco Rossi' },
          { role: 'Assistant Referee 1', name: 'John Smith' },
          { role: 'Assistant Referee 2', name: 'Peter Jones' },
          { role: 'VAR Official', name: 'Claire Adams' },
        ],
      });
    } else {
      // Default Cricket match card preview
      this.smartMatchCard.set({
        matchId: fullMatchId,
        title: 'Semi-Finals: Royal Strikers vs Titan Kings',
        tournamentName: 'Cricket Premier Cup 2026',
        status: 'live',
        sportType: 'cricket',
        homeTeam: { name: 'Royal Strikers', code: 'RSC', score: '184/4 (18.2 ov)' },
        awayTeam: { name: 'Titan Kings', code: 'TKS', score: '180/8 (20.0 ov)' },
        venue: 'National Sports Complex, Pitch 1',
        startTime: 'Today, 4:30 PM IST',
        officials: [
          { role: 'Field Umpire 1', name: 'Alex Miller' },
          { role: 'Field Umpire 2', name: 'David Warner' },
          { role: 'Match Referee', name: 'Robert Hawkins' },
          { role: 'TV / 3rd Umpire', name: 'Sarah Jenkins' },
        ],
      });
    }
  }

  private extractLinkPreview(rawText: string): void {
    // URL matching regex
    const urlMatch = rawText.match(/(https?:\/\/[^\s]+)/i);
    if (!urlMatch) return;

    const url = urlMatch[0];
    let domain = 'web';
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
    } catch {}

    // Mock open-graph preview metadata generator
    let title = `${domain} — Official Overview & Documentation`;
    let description = `Explore official resources, updates, and community guides on ${domain}.`;
    let thumbnailUrl: string | undefined =
      `https://picsum.photos/seed/${encodeURIComponent(domain)}/600/350`;

    if (domain.includes('github')) {
      title = 'GitHub Repository • Workspace Source Code & Projects';
      description =
        'Build software better together. Powerful collaboration, workflow automation, and code management.';
    } else if (domain.includes('youtube') || domain.includes('youtu.be')) {
      title = 'Watch Football Highlights & Tournament Streams';
      description = 'Official match replays, player analysis, and tactical summaries on YouTube.';
    } else if (domain.includes('angular')) {
      title = "Angular • The Modern Web Developer's Platform";
      description =
        'Deliver web applications with speed and efficiency using component-driven architecture.';
    }

    this.linkPreview.set({
      url,
      title,
      description,
      thumbnailUrl,
      siteName: domain,
    });
  }

  private parseRichMessage(rawText: string): string {
    if (!rawText) return '';

    // Direct GIF or Sticker syntax
    if (rawText.startsWith('[GIF:') && rawText.endsWith(']')) {
      const gifUrl = rawText.substring(5, rawText.length - 1);
      return `<img src="${this.escapeHtml(gifUrl)}" alt="GIF" class="msg-gif" />`;
    }
    if (rawText.startsWith('[STICKER:') && rawText.endsWith(']')) {
      const stickerUrl = rawText.substring(9, rawText.length - 1);
      return `<img src="${this.escapeHtml(stickerUrl)}" alt="Sticker" class="msg-sticker" />`;
    }

    let text = this.escapeHtml(rawText);

    // 0. Attachments parsing [ATTACHMENT:url|name|category|size]
    text = text.replace(
      /\[ATTACHMENT:(.*?)\|(.*?)\|(.*?)\|(.*?)\]/g,
      (match, url, name, category, size) => {
        const safeUrl = this.escapeHtml(url);
        const safeName = this.escapeHtml(name);
        const safeSize = this.escapeHtml(size);

        if (category === 'image') {
          return `<img src="${safeUrl}" alt="${safeName}" class="msg-att-img" />`;
        }
        if (category === 'video') {
          return `<video src="${safeUrl}" controls class="msg-att-video"></video>`;
        }
        if (category === 'audio') {
          this.audioSource.set({ url: safeUrl, name: safeName, size: safeSize });
          return '';
        }

        let iconClass = 'fi fi-rr-file text-slate-400';
        if (category === 'pdf') iconClass = 'fi fi-rr-file-pdf text-rose-400';
        if (category === 'word') iconClass = 'fi fi-rr-document text-blue-400';
        if (category === 'excel') iconClass = 'fi fi-rr-stats text-emerald-400';
        if (category === 'zip') iconClass = 'fi fi-rr-box-alt text-amber-400';
        if (category === 'apk') iconClass = 'fi fi-rr-mobile text-purple-400';

        return `
          <div class="msg-att-card">
            <div class="flex items-center gap-2.5 min-w-0">
              <i class="${iconClass} text-xl"></i>
              <div class="min-w-0">
                <p class="font-bold text-white text-xs truncate mb-0.5">${safeName}</p>
                <p class="text-[10px] text-slate-400 mb-0">${safeSize}</p>
              </div>
            </div>
            <a href="${safeUrl}" target="_blank" download class="att-dl-btn flex items-center gap-1">
              <i class="fi fi-rr-download text-xs"></i> Download
            </a>
          </div>
        `;
      },
    );

    // 1. Code blocks ```code```
    text = text.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
      return `<pre class="code-block"><code>${codeContent.trim()}</code></pre>`;
    });

    // 2. Blockquotes > quote
    text = text.replace(/^&gt;\s+(.*$)/gim, '<blockquote class="quote-block">$1</blockquote>');

    // 3. Markdown Tables | col 1 | col 2 |
    const lines = text.split('\n');
    let inTable = false;
    let tableHtml = '';
    const processedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableHtml = '<table class="rich-table"><thead>';
          const cols = line
            .split('|')
            .filter((c) => c.trim() !== '')
            .map((c) => `<th>${c.trim()}</th>`)
            .join('');
          tableHtml += `<tr>${cols}</tr></thead><tbody>`;
        } else if (line.includes('---')) {
          continue;
        } else {
          const cols = line
            .split('|')
            .filter((c) => c.trim() !== '')
            .map((c) => `<td>${c.trim()}</td>`)
            .join('');
          tableHtml += `<tr>${cols}</tr>`;
        }
      } else {
        if (inTable) {
          inTable = false;
          tableHtml += '</tbody></table>';
          processedLines.push(tableHtml);
          tableHtml = '';
        }
        processedLines.push(lines[i]);
      }
    }
    if (inTable) {
      tableHtml += '</tbody></table>';
      processedLines.push(tableHtml);
    }
    text = processedLines.join('\n');

    // 4. Bullet lists & Ordered lists
    text = text.replace(/^- (.*$)/gim, '<ul class="rich-list"><li>$1</li></ul>');
    text = text.replace(/^(\d+)\.\s+(.*$)/gim, '<ol class="rich-list-ordered"><li>$2</li></ol>');
    text = text.replace(/<\/ul>\n<ul class="rich-list">/g, '');
    text = text.replace(/<\/ol>\n<ol class="rich-list-ordered">/g, '');

    // 5. Formatting syntax
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/gi, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/&lt;i&gt;(.*?)&lt;\/i&gt;/gi, '<em>$1</em>');
    text = text.replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gi, '<u>$1</u>');
    text = text.replace(/~~(.*?)~~/g, '<del>$1</del>');
    text = text.replace(/&lt;s&gt;(.*?)&lt;\/s&gt;/gi, '<del>$1</del>');
    text = text.replace(/`(.*?)`/g, '<code class="inline-code">$1</code>');

    // 6. Mentions Parsing (@everyone, @admins, @referees, @volunteers, @user, #channel)
    text = text.replace(
      /@(everyone|admins|referees|volunteers)\b/gi,
      '<span class="mention-tag mention-group">@$1</span>',
    );
    text = text.replace(
      /@([a-zA-Z0-9_\-]+)\b/g,
      '<span class="mention-tag mention-user mention-player cursor-pointer hover:underline" data-player-handle="$1">@$1</span>',
    );
    text = text.replace(
      /#([a-zA-Z0-9_\-]+)\b/g,
      '<span class="mention-tag mention-channel">#$1</span>',
    );

    // Convert newlines outside elements to <br/>
    text = text.replace(/\n/g, '<br/>');

    return text;
  }

  private getPlayerProfileData(handle: string): PlayerProfileData {
    const cleanHandle = handle.toLowerCase().replace(/^player\./, '');

    if (cleanHandle.includes('habeeb') || cleanHandle.includes('admin')) {
      return {
        id: 'p-101',
        name: 'Habeeb Rahman',
        handle: 'habeeb.rahman',
        jerseyNumber: 10,
        position: 'Captain / All-Rounder',
        teamName: 'Royal Strikers FC',
        teamCode: 'RSC',
        rating: 9.6,
        stats: {
          matchesPlayed: 38,
          goalsOrRuns: '1,240',
          assistsOrWickets: '42',
          mvpCount: 8,
        },
        attendancePercentage: 96,
      };
    } else if (cleanHandle.includes('rahman') || cleanHandle.includes('referee')) {
      return {
        id: 'p-102',
        name: 'Rahman Khan',
        handle: 'rahman.khan',
        jerseyNumber: 7,
        position: 'Top-Order Batter / Striker',
        teamName: 'Titan Kings',
        teamCode: 'TKS',
        rating: 9.2,
        stats: {
          matchesPlayed: 29,
          goalsOrRuns: '980',
          assistsOrWickets: '18',
          mvpCount: 5,
        },
        attendancePercentage: 92,
      };
    } else if (
      cleanHandle.includes('smith') ||
      cleanHandle.includes('alex') ||
      cleanHandle.includes('umpire')
    ) {
      return {
        id: 'p-103',
        name: 'Alex Smith',
        handle: 'alex.smith',
        jerseyNumber: 18,
        position: 'Fast Bowler / Defender',
        teamName: 'Dynamo FC',
        teamCode: 'DFC',
        rating: 8.9,
        stats: {
          matchesPlayed: 24,
          goalsOrRuns: '340',
          assistsOrWickets: '38',
          mvpCount: 3,
        },
        attendancePercentage: 88,
      };
    }

    return {
      id: `p-${cleanHandle}`,
      name: handle.charAt(0).toUpperCase() + handle.slice(1).replace(/[\._]/g, ' '),
      handle: cleanHandle,
      jerseyNumber: 11,
      position: 'Senior Squad Member',
      teamName: 'League All-Stars',
      teamCode: 'LAS',
      rating: 8.7,
      stats: {
        matchesPlayed: 18,
        goalsOrRuns: '450',
        assistsOrWickets: '14',
        mvpCount: 2,
      },
      attendancePercentage: 90,
    };
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
