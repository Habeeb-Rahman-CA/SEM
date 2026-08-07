import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CreatePollModalComponent, PollData } from '../create-poll-modal/create-poll-modal';
import {
  CreateAnnouncementModalComponent,
  AnnouncementData,
} from '../create-announcement-modal/create-announcement-modal';

export interface MentionSuggestion {
  id: string;
  name: string;
  type: 'user' | 'role' | 'channel' | 'group';
  detail?: string;
  icon: string;
  insertText: string;
}

export interface AttachmentItem {
  id: string;
  file: File;
  name: string;
  sizeFormatted: string;
  category: 'image' | 'video' | 'audio' | 'pdf' | 'word' | 'excel' | 'zip' | 'apk' | 'file';
  previewUrl?: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
}

@Component({
  selector: 'app-chat-rich-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule, CreatePollModalComponent, CreateAnnouncementModalComponent],
  templateUrl: './chat-rich-message-input.html',
  styleUrls: ['./chat-rich-message-input.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatRichMessageInputComponent {
  @Input() placeholder: string = 'Type a rich message...';
  @Input() disabled: boolean = false;
  @Input() isSending: boolean = false;
  @Input() members: any[] = [];
  @Input() channels: any[] = [];

  @Input() replyingToMessage: any = null;
  @Input() editingMessage: any = null;

  @Output() sendMessage = new EventEmitter<{
    content: string;
    attachments?: string[];
    poll?: PollData;
  }>();
  @Output() sendPoll = new EventEmitter<PollData>();
  @Output() sendAnnouncement = new EventEmitter<AnnouncementData>();
  @Output() typing = new EventEmitter<void>();
  @Output() cancelReply = new EventEmitter<void>();
  @Output() cancelEdit = new EventEmitter<void>();

  isCreatePollOpen = signal<boolean>(false);
  isCreateAnnouncementOpen = signal<boolean>(false);

  handleCreatePoll(poll: PollData) {
    this.isCreatePollOpen.set(false);
    this.sendPoll.emit(poll);
  }

  handleCreateAnnouncement(announcement: AnnouncementData) {
    this.isCreateAnnouncementOpen.set(false);
    this.sendAnnouncement.emit(announcement);
  }

  @ViewChild('textareaRef') textareaRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInputRef') fileInputRef!: ElementRef<HTMLInputElement>;

  content = signal<string>('');

  // Attachments Queue State
  attachments = signal<AttachmentItem[]>([]);
  isDragging = signal<boolean>(false);

  // Pickers state
  showEmojiPicker = signal<boolean>(false);
  showGifPicker = signal<boolean>(false);
  showStickerPicker = signal<boolean>(false);
  activeEmojiCategory = signal<string>('sports');

  // Audio Recording State (Hold-to-Record, Waveform, Pause/Resume & Noise Reduction)
  isRecordingAudio = signal<boolean>(false);
  isRecordingPaused = signal<boolean>(false);
  recordingDuration = signal<number>(0);
  isNoiseSuppressionEnabled = signal<boolean>(true);
  liveWaveformLevels = signal<number[]>([20, 45, 70, 30, 85, 40, 60, 90, 50, 30, 65, 80]);

  private mediaRecorder?: MediaRecorder;
  private audioChunks: Blob[] = [];
  private recordingTimer?: any;
  private audioCtx?: AudioContext;
  private analyserNode?: AnalyserNode;
  private animFrameId?: number;

  // Mention Autocomplete state
  showMentionPicker = signal<boolean>(false);
  mentionQuery = signal<string>('');
  mentionCursorIndex = signal<number>(0);
  selectedMentionIndex = signal<number>(0);

  // Group Mention Presets
  groupMentions: MentionSuggestion[] = [
    {
      id: 'everyone',
      name: 'everyone',
      type: 'group',
      detail: 'Notify all members in workspace',
      icon: 'fi fi-rr-users-alt text-amber-400',
      insertText: '@everyone',
    },
    {
      id: 'admins',
      name: 'admins',
      type: 'group',
      detail: 'Notify workspace administrators',
      icon: 'fi fi-rr-shield-check text-violet-400',
      insertText: '@admins',
    },
    {
      id: 'referees',
      name: 'referees',
      type: 'group',
      detail: 'Notify referee & officiating team',
      icon: 'fi fi-rr-whistle text-cyan-400',
      insertText: '@referees',
    },
    {
      id: 'volunteers',
      name: 'volunteers',
      type: 'group',
      detail: 'Notify volunteer team leaders',
      icon: 'fi fi-rr-heart-partner-handshake text-emerald-400',
      insertText: '@volunteers',
    },
  ];

  // Emojis catalog
  emojiCategories: { [key: string]: { label: string; emojis: string[] } } = {
    sports: {
      label: 'Sports & Games',
      emojis: [
        '⚽',
        '🏀',
        '🏈',
        '⚾',
        '🥎',
        '🎾',
        '🏐',
        '🏉',
        '🥏',
        '🎱',
        '🏓',
        '🏸',
        '🏒',
        '🏑',
        '🥍',
        '🏏',
        '🥊',
        '🥋',
        '🎽',
        '🛹',
        '🛼',
        '🛷',
        '⛸️',
        '🌁',
        '🏆',
        '🥇',
        '🥈',
        '🥉',
        '🏅',
        '🎖️',
        '🎗️',
        '🎫',
        '🎟️',
        '🎪',
      ],
    },
    smileys: {
      label: 'Smileys & Reactions',
      emojis: [
        '😀',
        '😃',
        '😄',
        '😁',
        '😆',
        '😅',
        '🤣',
        '😂',
        '🙂',
        '🙃',
        '😉',
        '😊',
        '😇',
        '🥰',
        '😍',
        '🤩',
        '😘',
        '😗',
        '😚',
        '😙',
        '😋',
        '😛',
        '😜',
        '🤪',
        '😝',
        '🤑',
        '🤗',
        '🤭',
        '🤫',
        '🤔',
        '🤐',
        '🤨',
        '😐',
        '😑',
        '😶',
        '😏',
        '😒',
        '🙄',
        '😬',
      ],
    },
    objects: {
      label: 'Objects & Flags',
      emojis: [
        '🎯',
        '🚩',
        '🏁',
        '📢',
        '📣',
        '🔔',
        '🔕',
        '🎼',
        '🎵',
        '🎶',
        '🎤',
        '🎧',
        '📻',
        '🎷',
        '🎸',
        '🎹',
        '🎺',
        '🎻',
        '🪕',
        '🥁',
        '📱',
        '💻',
        '🖥️',
        '🖨️',
        '📈',
        '📉',
        '📊',
        '📋',
        '📌',
        '📍',
        '📎',
        '🔒',
        '🔑',
      ],
    },
    symbols: {
      label: 'Symbols & Indicators',
      emojis: [
        '❤️',
        '🧡',
        '💛',
        '💚',
        '💙',
        '💜',
        '🖤',
        '🤍',
        '🤎',
        '💔',
        '❣️',
        '💕',
        '💞',
        '💓',
        '💗',
        '💖',
        '💘',
        '💝',
        '⭐',
        '🌟',
        '✨',
        '⚡',
        '🔥',
        '💥',
        '💯',
        '✅',
        '❌',
        '⚠️',
        '🚨',
        '🔴',
        '🟢',
        '🔵',
        '⚪',
        '⬛',
      ],
    },
  };

  // GIFs catalog
  gifs = [
    { title: 'Goal Celebration', url: 'https://media.giphy.com/media/l0HlHJGHe3yAMhdQY/giphy.gif' },
    {
      title: 'Red Card Referee',
      url: 'https://media.giphy.com/media/3o7TKrEzvLbsVAJd84/giphy.gif',
    },
    { title: 'Trophy Winner', url: 'https://media.giphy.com/media/26tknCqiYwe7CTdYA/giphy.gif' },
    { title: 'Mind Blown', url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif' },
    { title: 'High Five', url: 'https://media.giphy.com/media/3oEjHV0z85GPvfxk2A/giphy.gif' },
    { title: 'Applause Clap', url: 'https://media.giphy.com/media/l3q2XhfQ8oCkm1Ts4/giphy.gif' },
    { title: 'Fire Flame', url: 'https://media.giphy.com/media/Lopx9eUi34rbq/giphy.gif' },
    { title: 'Winning Cheer', url: 'https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif' },
  ];

  // Stickers catalog
  stickers = [
    { title: 'GOAL!', icon: 'fi fi-rr-football', bg: 'bg-emerald-600', text: 'GOAL!' },
    { title: 'RED CARD', icon: 'fi fi-rr-shield-exclamation', bg: 'bg-rose-600', text: 'RED CARD' },
    { title: 'MVP', icon: 'fi fi-rr-crown', bg: 'bg-amber-500', text: 'MVP' },
    { title: 'CHAMPION', icon: 'fi fi-rr-trophy', bg: 'bg-yellow-500', text: 'CHAMPION' },
    { title: 'APPROVED', icon: 'fi fi-rr-check-circle', bg: 'bg-indigo-600', text: 'APPROVED' },
    { title: 'HIGH FIVE', icon: 'fi fi-rr-hand', bg: 'bg-violet-600', text: 'HIGH FIVE' },
    { title: 'FIRE', icon: 'fi fi-rr-flame', bg: 'bg-orange-600', text: 'ON FIRE' },
    { title: 'GG', icon: 'fi fi-rr-smile', bg: 'bg-cyan-600', text: 'GOOD GAME' },
  ];

  allMentionSuggestions = computed<MentionSuggestion[]>(() => {
    const list: MentionSuggestion[] = [...this.groupMentions];

    if (this.members && this.members.length > 0) {
      for (const m of this.members) {
        const username = m.user?.username || m.username;
        if (username) {
          list.push({
            id: m.userId || m.id,
            name: username,
            type: 'user',
            detail: m.role?.name || 'Member',
            icon: 'fi fi-rr-user text-indigo-400',
            insertText: `@${username}`,
          });
        }
      }
    }

    const roleNames = new Set<string>();
    if (this.members) {
      for (const m of this.members) {
        const rName = m.role?.name;
        if (rName && !roleNames.has(rName)) {
          roleNames.add(rName);
          list.push({
            id: `role-${rName}`,
            name: rName,
            type: 'role',
            detail: 'Workspace Role',
            icon: 'fi fi-rr-key text-purple-400',
            insertText: `@${rName.toLowerCase().replace(/\s+/g, '_')}`,
          });
        }
      }
    }

    if (this.channels && this.channels.length > 0) {
      for (const c of this.channels) {
        list.push({
          id: c.id,
          name: c.name,
          type: 'channel',
          detail: 'Workspace Channel',
          icon: c.icon || 'fi fi-rr-hashtag text-cyan-400',
          insertText: `@${c.name.toLowerCase().replace(/\s+/g, '-')}`,
        });
      }
    }

    return list;
  });

  filteredMentionSuggestions = computed<MentionSuggestion[]>(() => {
    const q = this.mentionQuery().toLowerCase().trim();
    const suggestions = this.allMentionSuggestions();
    if (!q) return suggestions;
    return suggestions.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.insertText.toLowerCase().includes(q) ||
        s.detail?.toLowerCase().includes(q),
    );
  });

  activeCategoryEmojis = computed(() => {
    return this.emojiCategories[this.activeEmojiCategory()]?.emojis || [];
  });

  // DRAG & DROP HANDLERS
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  // CLIPBOARD PASTE HANDLER
  onPaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      this.handleFiles(files);
    }
  }

  // FILE INPUT HANDLER
  triggerFileInput() {
    this.fileInputRef?.nativeElement?.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
      input.value = '';
    }
  }

  private handleFiles(files: File[]) {
    const newItems: AttachmentItem[] = files.map((file) => {
      const id = 'att-' + Math.random().toString(36).substring(2, 9);
      const category = this.getFileCategory(file);
      const previewUrl = category === 'image' ? URL.createObjectURL(file) : undefined;

      const item: AttachmentItem = {
        id,
        file,
        name: file.name,
        sizeFormatted: this.formatBytes(file.size),
        category,
        previewUrl,
        progress: 0,
        status: 'uploading',
      };

      this.simulateUpload(item);
      return item;
    });

    this.attachments.update((prev) => [...prev, ...newItems]);
  }

  private simulateUpload(item: AttachmentItem) {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 25) + 15;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);

        // Generate simulated object URL or data URL
        const mockUrl =
          item.previewUrl || `https://storage.taisen.app/files/${encodeURIComponent(item.name)}`;
        this.attachments.update((list) =>
          list.map((att) =>
            att.id === item.id ? { ...att, progress: 100, status: 'completed', url: mockUrl } : att,
          ),
        );
      } else {
        this.attachments.update((list) =>
          list.map((att) => (att.id === item.id ? { ...att, progress: currentProgress } : att)),
        );
      }
    }, 150);
  }

  removeAttachment(id: string) {
    this.attachments.update((list) => {
      const target = list.find((a) => a.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return list.filter((a) => a.id !== id);
    });
  }

  private getFileCategory(file: File): AttachmentItem['category'] {
    const mime = file.type.toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.includes('pdf') || ext === 'pdf') return 'pdf';
    if (mime.includes('word') || ext === 'doc' || ext === 'docx') return 'word';
    if (
      mime.includes('excel') ||
      mime.includes('spreadsheet') ||
      ext === 'xls' ||
      ext === 'xlsx' ||
      ext === 'csv'
    )
      return 'excel';
    if (
      ext === 'zip' ||
      ext === 'rar' ||
      ext === '7z' ||
      mime.includes('zip') ||
      mime.includes('archive')
    )
      return 'zip';
    if (ext === 'apk' || mime.includes('android')) return 'apk';
    return 'file';
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  onContentChange(val: string) {
    this.content.set(val);
    this.checkMentionTrigger();
  }

  private checkMentionTrigger() {
    const el = this.textareaRef?.nativeElement;
    if (!el) return;

    const cursorPos = el.selectionStart;
    const textBeforeCursor = this.content().substring(0, cursorPos);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord && (lastWord.startsWith('@') || lastWord.startsWith('#'))) {
      this.mentionQuery.set(lastWord.substring(1));
      this.mentionCursorIndex.set(cursorPos);
      this.selectedMentionIndex.set(0);
      this.showMentionPicker.set(true);
    } else {
      this.showMentionPicker.set(false);
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (this.showMentionPicker()) {
      const suggestions = this.filteredMentionSuggestions();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.selectedMentionIndex.update((idx) =>
          suggestions.length ? (idx + 1) % suggestions.length : 0,
        );
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.selectedMentionIndex.update((idx) =>
          suggestions.length ? (idx - 1 + suggestions.length) % suggestions.length : 0,
        );
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        if (suggestions.length > 0) {
          const selected = suggestions[this.selectedMentionIndex() || 0];
          this.applyMention(selected);
        }
        return;
      }
      if (event.key === 'Escape') {
        this.showMentionPicker.set(false);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitMessage();
    } else {
      this.typing.emit();
    }
  }

  applyMention(suggestion: MentionSuggestion) {
    const el = this.textareaRef?.nativeElement;
    if (!el) return;

    const text = this.content();
    const cursorPos = el.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const textAfterCursor = text.substring(cursorPos);

    const words = textBeforeCursor.split(/\s/);
    words.pop();

    const newBefore = words.join(' ') + (words.length > 0 ? ' ' : '') + suggestion.insertText + ' ';
    const newText = newBefore + textAfterCursor;

    this.content.set(newText);
    this.showMentionPicker.set(false);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(newBefore.length, newBefore.length);
    }, 10);
  }

  submitMessage() {
    let text = this.content().trim();
    const queuedAttachments = this.attachments();

    if ((!text && queuedAttachments.length === 0) || this.isSending || this.disabled) return;

    if (this.replyingToMessage) {
      const rep = this.replyingToMessage;
      const snippet = rep.content.substring(0, 50).replace(/\n/g, ' ');
      const quoteHeader = `> **Replying to @${rep.senderName}**: "${snippet}${rep.content.length > 50 ? '...' : ''}"\n\n`;
      text = quoteHeader + text;
    }

    // Append formatted markdown tags for attachments
    if (queuedAttachments.length > 0) {
      const attMarkup = queuedAttachments
        .map(
          (att) =>
            `[ATTACHMENT:${att.url || 'pending'}|${att.name}|${att.category}|${att.sizeFormatted}]`,
        )
        .join('\n');
      text = text ? `${text}\n${attMarkup}` : attMarkup;
    }

    this.sendMessage.emit({ content: text });
    this.content.set('');
    this.attachments.set([]);
    if (this.replyingToMessage) this.cancelReply.emit();
    if (this.editingMessage) this.cancelEdit.emit();
    this.closeAllPickers();
  }

  insertFormat(prefix: string, suffix: string = '') {
    const el = this.textareaRef?.nativeElement;
    if (!el) {
      this.content.update((c) => c + prefix + suffix);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentText = this.content();
    const selected = currentText.substring(start, end);
    const replacement = prefix + (selected || 'text') + suffix;

    const newText = currentText.substring(0, start) + replacement + currentText.substring(end);
    this.content.set(newText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selected || 'text').length,
      );
    }, 10);
  }

  insertBlock(blockText: string) {
    this.content.update((c) => (c ? `${c}\n${blockText}` : blockText));
    setTimeout(() => {
      this.textareaRef?.nativeElement?.focus();
    }, 10);
  }

  insertTable() {
    const tableTemplate = `\n| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Row 1 | Data 1 | Data 2 |\n| Row 2 | Data 3 | Data 4 |\n`;
    this.insertBlock(tableTemplate);
  }

  insertEmoji(emoji: string) {
    this.content.update((c) => c + emoji);
    this.showEmojiPicker.set(false);
  }

  sendGif(gifUrl: string) {
    this.sendMessage.emit({ content: `[GIF:${gifUrl}]` });
    this.showGifPicker.set(false);
  }

  sendSticker(stickerText: string) {
    this.sendMessage.emit({ content: `**[STICKER: ${stickerText}]**` });
    this.showStickerPicker.set(false);
  }

  toggleEmojiPicker() {
    const next = !this.showEmojiPicker();
    this.closeAllPickers();
    this.showEmojiPicker.set(next);
  }

  toggleGifPicker() {
    const next = !this.showGifPicker();
    this.closeAllPickers();
    this.showGifPicker.set(next);
  }

  toggleStickerPicker() {
    const next = !this.showStickerPicker();
    this.closeAllPickers();
    this.showStickerPicker.set(next);
  }

  closeAllPickers() {
    this.showEmojiPicker.set(false);
    this.showGifPicker.set(false);
    this.showStickerPicker.set(false);
    this.showMentionPicker.set(false);
  }

  // AUDIO RECORDING & WAVEFORM HANDLERS
  formattedRecordingTime = computed(() => {
    const sec = this.recordingDuration();
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  toggleNoiseSuppression() {
    this.isNoiseSuppressionEnabled.update((v) => !v);
  }

  async startAudioRecording(): Promise<void> {
    if (this.isRecordingAudio()) return;

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          noiseSuppression: this.isNoiseSuppressionEnabled(),
          echoCancellation: this.isNoiseSuppressionEnabled(),
          autoGainControl: true,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Set up AnalyserNode for live waveform
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
        const source = this.audioCtx.createMediaStreamSource(stream);
        this.analyserNode = this.audioCtx.createAnalyser();
        this.analyserNode.fftSize = 64;
        source.connect(this.analyserNode);
        this.updateLiveWaveform();
      }

      this.mediaRecorder.start();
      this.isRecordingAudio.set(true);
      this.isRecordingPaused.set(false);
      this.recordingDuration.set(0);

      this.recordingTimer = setInterval(() => {
        if (!this.isRecordingPaused()) {
          this.recordingDuration.update((d) => d + 1);
        }
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied or error:', err);
    }
  }

  pauseAudioRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.isRecordingPaused.set(true);
    }
  }

  resumeAudioRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.isRecordingPaused.set(false);
    }
  }

  togglePauseAudioRecording(): void {
    if (this.isRecordingPaused()) {
      this.resumeAudioRecording();
    } else {
      this.pauseAudioRecording();
    }
  }

  deleteAudioRecording(): void {
    this.cancelAudioRecording();
  }

  stopAndSendAudioRecording(): void {
    if (!this.mediaRecorder || !this.isRecordingAudio()) return;

    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const fileName = `Voice_Message_${new Date().getTime().toString().slice(-4)}.webm`;
      const sizeFormatted = `${(audioBlob.size / 1024).toFixed(1)} KB`;

      // Create audio attachment
      const attItem: AttachmentItem = {
        id: 'audio-' + Math.random().toString(36).substring(2, 9),
        file: new File([audioBlob], fileName, { type: 'audio/webm' }),
        name: fileName,
        sizeFormatted,
        category: 'audio',
        previewUrl: audioUrl,
        progress: 100,
        status: 'completed',
        url: audioUrl,
      };

      this.attachments.update((list) => [...list, attItem]);
      this.cleanupAudioRecording();
    };

    this.mediaRecorder.stop();
  }

  cancelAudioRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.cleanupAudioRecording();
  }

  private updateLiveWaveform(): void {
    if (!this.analyserNode || !this.isRecordingAudio()) return;

    if (!this.isRecordingPaused()) {
      const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.analyserNode.getByteFrequencyData(dataArray);

      const levels: number[] = [];
      const step = Math.floor(dataArray.length / 12);
      for (let i = 0; i < 12; i++) {
        const val = dataArray[i * step] || 10;
        levels.push(Math.max(15, Math.min(100, Math.floor((val / 255) * 100))));
      }
      this.liveWaveformLevels.set(levels);
    }

    this.animFrameId = requestAnimationFrame(() => this.updateLiveWaveform());
  }

  private cleanupAudioRecording(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
    if (this.mediaRecorder?.stream) {
      this.mediaRecorder.stream.getTracks().forEach((t) => t.stop());
    }
    this.isRecordingAudio.set(false);
    this.isRecordingPaused.set(false);
    this.recordingDuration.set(0);
  }
}
