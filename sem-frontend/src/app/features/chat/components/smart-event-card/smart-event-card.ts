import { Component, Input, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SmartMatchData {
  matchId: string;
  title: string;
  tournamentName: string;
  status: 'live' | 'scheduled' | 'completed';
  sportType: 'cricket' | 'football' | 'basketball' | 'other';
  homeTeam: { name: string; code: string; logoUrl?: string; score?: string; colorBg?: string };
  awayTeam: { name: string; code: string; logoUrl?: string; score?: string; colorBg?: string };
  venue: string;
  startTime: string;
  statusText?: string;
  officials: { role: string; name: string }[];
}

@Component({
  selector: 'app-smart-event-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './smart-event-card.html',
  styleUrls: ['./smart-event-card.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmartEventCardComponent {
  @Input() matchData!: SmartMatchData;

  isExpanded = signal<boolean>(false);

  toggleExpand(): void {
    this.isExpanded.update((v) => !v);
  }
}
