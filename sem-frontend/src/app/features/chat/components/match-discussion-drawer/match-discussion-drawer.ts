import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SmartMatchData } from '../smart-event-card/smart-event-card';
import { ChatService } from '../../services/chat.service';

export interface MatchDiscussionNote {
  id: string;
  matchId: string;
  senderName: string;
  senderRole: 'Referee' | 'Coach' | 'Official' | 'Organizer';
  roleColor: string;
  content: string;
  timestamp: string;
  isPinned?: boolean;
}

@Component({
  selector: 'app-match-discussion-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './match-discussion-drawer.html',
  styleUrls: ['./match-discussion-drawer.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchDiscussionDrawerComponent implements OnInit {
  @Input() workspaceId: string = 'default-ws';
  @Input() matchData!: SmartMatchData;
  @Output() close = new EventEmitter<void>();

  private chatService = inject(ChatService);

  selectedRoleFilter = signal<'all' | 'Referee' | 'Coach' | 'Official' | 'Organizer'>('all');
  noteInput = signal<string>('');

  discussionNotes = signal<MatchDiscussionNote[]>([
    {
      id: 'mdn-1',
      matchId: 'MATCH-101',
      senderName: 'David Warner',
      senderRole: 'Referee',
      roleColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      content:
        'Pitch Inspection Report: Moisture level is 12%. Outfield dry and ready for toss at 4:15 PM IST.',
      timestamp: 'Today, 4:05 PM',
      isPinned: true,
    },
    {
      id: 'mdn-2',
      matchId: 'MATCH-101',
      senderName: 'Habeeb Rahman',
      senderRole: 'Organizer',
      roleColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      content:
        'Security personnel and medical response team deployed at South Stand and Pitch Boundary.',
      timestamp: 'Today, 4:12 PM',
    },
    {
      id: 'mdn-3',
      matchId: 'MATCH-101',
      senderName: 'Alex Miller',
      senderRole: 'Coach',
      roleColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      content:
        'Royal Strikers lineup submitted. Player #10 Habeeb Rahman leading the squad as captain.',
      timestamp: 'Today, 4:20 PM',
    },
    {
      id: 'mdn-4',
      matchId: 'MATCH-101',
      senderName: 'Robert Hawkins',
      senderRole: 'Official',
      roleColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
      content:
        'Match ball inspection passed. 3rd Umpire TV replay feeds verified with live broadcast truck.',
      timestamp: 'Today, 4:25 PM',
    },
  ]);

  ngOnInit(): void {
    const mId = this.matchData?.matchId || 'MATCH-101';
    this.chatService.getMatchNotes(this.workspaceId, mId).subscribe({
      next: (dbNotes) => {
        if (dbNotes && dbNotes.length > 0) {
          const mapped: MatchDiscussionNote[] = dbNotes.map((n: any) => ({
            id: n.id,
            matchId: n.matchId,
            senderName: n.senderName,
            senderRole: n.senderRole,
            roleColor: n.roleColor || 'bg-violet-500/20 text-violet-300 border-violet-500/30',
            content: n.content,
            timestamp: new Date(n.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isPinned: !!n.isPinned,
          }));
          this.discussionNotes.set(mapped);
        }
      },
      error: () => {},
    });
  }

  get filteredNotes(): MatchDiscussionNote[] {
    const filter = this.selectedRoleFilter();
    if (filter === 'all') return this.discussionNotes();
    return this.discussionNotes().filter((n) => n.senderRole === filter);
  }

  sendNote(): void {
    const text = this.noteInput().trim();
    if (!text) return;

    const mId = this.matchData?.matchId || 'MATCH-101';
    const newNote: MatchDiscussionNote = {
      id: `mdn-${Date.now()}`,
      matchId: mId,
      senderName: 'Habeeb Rahman',
      senderRole: 'Organizer',
      roleColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      content: text,
      timestamp: 'Just now',
    };

    this.discussionNotes.update((notes) => [...notes, newNote]);
    this.noteInput.set('');

    this.chatService
      .createMatchNote(this.workspaceId, mId, {
        senderId: 'user-admin',
        senderName: 'Habeeb Rahman',
        senderRole: 'Organizer',
        roleColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        content: text,
      })
      .subscribe({
        error: () => {},
      });
  }

  insertTemplate(type: 'pitch' | 'lineup' | 'notice'): void {
    if (type === 'pitch') {
      this.noteInput.set(
        '📋 Pitch & Weather Status: Ground in prime condition. Play cleared to proceed without delay.',
      );
    } else if (type === 'lineup') {
      this.noteInput.set('⚽ Official Team Roster & Subs confirmed and signed by Head Coach.');
    } else if (type === 'notice') {
      this.noteInput.set('⚠️ Official Notice: Power backup and camera telemetry checks complete.');
    }
  }
}
