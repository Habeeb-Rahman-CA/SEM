import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PollData, PollOptionData } from '../create-poll-modal/create-poll-modal';

@Component({
  selector: 'app-poll-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './poll-card.html',
  styleUrls: ['./poll-card.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollCardComponent {
  @Input({ required: true }) poll!: PollData;
  @Input({ required: true }) currentUserId: string = '';

  @Output() vote = new EventEmitter<{ pollId: string; optionId: string }>();

  getTotalVotes(): number {
    if (!this.poll?.options) return 0;
    return this.poll.options.reduce((sum, opt) => sum + (opt.votes ? opt.votes.length : 0), 0);
  }

  getOptionPercentage(opt: PollOptionData): number {
    const total = this.getTotalVotes();
    if (total === 0) return 0;
    const count = opt.votes ? opt.votes.length : 0;
    return Math.round((count / total) * 100);
  }

  hasUserVoted(opt: PollOptionData): boolean {
    if (!opt.votes || !this.currentUserId) return false;
    return opt.votes.includes(this.currentUserId);
  }

  isPollExpired(): boolean {
    if (this.poll.closed) return true;
    if (!this.poll.expiresAt) return false;
    return new Date(this.poll.expiresAt).getTime() <= new Date().getTime();
  }

  onOptionClick(optId: string) {
    if (this.isPollExpired()) return;
    this.vote.emit({ pollId: this.poll.id, optionId: optId });
  }
}
