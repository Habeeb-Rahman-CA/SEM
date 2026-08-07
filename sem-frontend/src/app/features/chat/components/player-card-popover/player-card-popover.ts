import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PlayerProfileData {
  id: string;
  name: string;
  handle: string;
  jerseyNumber: number;
  position: string;
  teamName: string;
  teamCode: string;
  rating: number;
  avatarUrl?: string;
  stats: {
    matchesPlayed: number;
    goalsOrRuns: string;
    assistsOrWickets: string;
    mvpCount: number;
  };
  attendancePercentage: number;
}

@Component({
  selector: 'app-player-card-popover',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-card-popover.html',
  styleUrls: ['./player-card-popover.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerCardPopoverComponent {
  @Input() player!: PlayerProfileData;
  @Input() position: { x: number; y: number } = { x: 0, y: 0 };
}
