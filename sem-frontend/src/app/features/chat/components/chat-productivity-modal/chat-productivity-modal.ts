import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  signal,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-chat-productivity-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-productivity-modal.html',
  styleUrls: ['./chat-productivity-modal.css'],
})
export class ChatProductivityModalComponent implements OnInit {
  @Input() workspaceId: string = 'ws-1';
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();

  activeTab = signal<
    'starred' | 'reminders' | 'tasks' | 'calendar' | 'bookmarks' | 'recent_files' | 'shortcuts'
  >('starred');

  starredMessages = signal<any[]>([]);
  reminders = signal<any[]>([]);
  tasks = signal<any[]>([]);
  calendarEvents = signal<any[]>([]);
  bookmarks = signal<any[]>([]);
  recentFiles = signal<any[]>([]);

  // Keyboard Shortcuts Mapping
  shortcuts = [
    { keyCombo: 'Ctrl + K', description: 'Open Quick Channel Switcher' },
    { keyCombo: 'Ctrl + Shift + F', description: 'Search Workspace Messages & Files' },
    { keyCombo: 'Alt + ↑ / ↓', description: 'Navigate to Previous / Next Channel' },
    { keyCombo: 'Ctrl + Enter', description: 'Send Rich Text Chat Message' },
    { keyCombo: 'Esc', description: 'Close Modals & Drawers' },
    { keyCombo: 'Ctrl + S', description: 'Star / Save Active Message' },
    { keyCombo: 'Ctrl + /', description: 'Toggle Keyboard Shortcuts Guide' },
  ];

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    if (this.isOpen) {
      this.loadAllProductivityData();
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === '/') {
      event.preventDefault();
      this.activeTab.set('shortcuts');
    }
  }

  loadAllProductivityData() {
    this.chatService.getStarredMessages(this.workspaceId).subscribe({
      next: (data) => this.starredMessages.set(data),
    });
    this.chatService.getReminders(this.workspaceId).subscribe({
      next: (data) => this.reminders.set(data),
    });
    this.chatService.getTasks(this.workspaceId).subscribe({
      next: (data) => this.tasks.set(data),
    });
    this.chatService.getCalendarEvents(this.workspaceId).subscribe({
      next: (data) => this.calendarEvents.set(data),
    });
    this.chatService.getBookmarks(this.workspaceId).subscribe({
      next: (data) => this.bookmarks.set(data),
    });
    this.chatService.getRecentlySharedFiles(this.workspaceId).subscribe({
      next: (data) => this.recentFiles.set(data),
    });
  }

  closeModal() {
    this.close.emit();
  }
}
