import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';

export interface RepositoryFileItem {
  id: string;
  name: string;
  category: 'images' | 'documents' | 'videos' | 'other';
  folderName: string;
  size: string;
  uploaderName: string;
  uploadedAt: string;
  thumbnailUrl?: string;
  isPinned: boolean;
  isRecent: boolean;
  downloadUrl?: string;
}

export interface RepositoryFolder {
  id: string;
  name: string;
  fileCount: number;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-file-repository-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-repository-modal.html',
  styleUrls: ['./file-repository-modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileRepositoryModalComponent implements OnInit {
  @Input() workspaceId: string = 'default-ws';
  @Input() channelName: string = 'General';
  @Output() close = new EventEmitter<void>();
  @Output() previewFile = new EventEmitter<RepositoryFileItem>();

  private chatService = inject(ChatService);

  activeTab = signal<'all' | 'folders' | 'images' | 'documents' | 'videos' | 'recent' | 'pinned'>(
    'all',
  );
  searchQuery = signal<string>('');
  selectedFolderFilter = signal<string | null>(null);
  viewMode = signal<'grid' | 'list'>('grid');
  isLoading = signal<boolean>(false);

  folders = signal<RepositoryFolder[]>([
    {
      id: 'f-1',
      name: 'Match Reports 2026',
      fileCount: 14,
      icon: 'fi-rr-folder',
      color: 'text-violet-400 bg-violet-500/20',
    },
    {
      id: 'f-2',
      name: 'Tournament Media & Photos',
      fileCount: 28,
      icon: 'fi-rr-folder-image',
      color: 'text-emerald-400 bg-emerald-500/20',
    },
    {
      id: 'f-3',
      name: 'Tactical Playbooks & Specs',
      fileCount: 9,
      icon: 'fi-rr-folder-download',
      color: 'text-cyan-400 bg-cyan-500/20',
    },
    {
      id: 'f-4',
      name: 'Official Permits & Certificates',
      fileCount: 6,
      icon: 'fi-rr-folder-lock',
      color: 'text-amber-400 bg-amber-500/20',
    },
  ]);

  files = signal<RepositoryFileItem[]>([
    {
      id: 'repo-1',
      name: 'Premier_League_Tournament_Schedule_2026.pdf',
      category: 'documents',
      folderName: 'Match Reports 2026',
      size: '4.8 MB',
      uploaderName: 'Habeeb Rahman',
      uploadedAt: 'Today, 2:15 PM',
      isPinned: true,
      isRecent: true,
    },
    {
      id: 'repo-2',
      name: 'Stadium_Pitch_Inspection_HD_Snapshot.jpg',
      category: 'images',
      folderName: 'Tournament Media & Photos',
      size: '3.2 MB',
      uploaderName: 'David Warner (Umpire)',
      uploadedAt: 'Today, 11:40 AM',
      thumbnailUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&q=80',
      isPinned: true,
      isRecent: true,
    },
    {
      id: 'repo-3',
      name: 'Semi_Final_Highlights_4K_Telemetry.mp4',
      category: 'videos',
      folderName: 'Tournament Media & Photos',
      size: '48.5 MB',
      uploaderName: 'Broadcasting Team',
      uploadedAt: 'Yesterday, 6:00 PM',
      isPinned: false,
      isRecent: true,
    },
    {
      id: 'repo-4',
      name: 'Team_Roster_Signed_Permits.docx',
      category: 'documents',
      folderName: 'Official Permits & Certificates',
      size: '1.2 MB',
      uploaderName: 'Rahman Khan',
      uploadedAt: 'Aug 5, 2026',
      isPinned: false,
      isRecent: false,
    },
    {
      id: 'repo-5',
      name: 'Tactical_Formation_Analysis_Diagram.png',
      category: 'images',
      folderName: 'Tactical Playbooks & Specs',
      size: '2.6 MB',
      uploaderName: 'Alex Smith (Coach)',
      uploadedAt: 'Aug 4, 2026',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266010b?w=400&q=80',
      isPinned: true,
      isRecent: false,
    },
  ]);

  ngOnInit(): void {
    this.loadFromDatabase();
  }

  loadFromDatabase(): void {
    this.isLoading.set(true);
    this.chatService.getRepositoryFolders(this.workspaceId).subscribe({
      next: (dbFolders) => {
        if (dbFolders && dbFolders.length > 0) {
          const mapped: RepositoryFolder[] = dbFolders.map((f: any) => ({
            id: f.id,
            name: f.name,
            fileCount: f.items ? f.items.length : 0,
            icon: f.icon || 'fi-rr-folder',
            color: f.color || 'text-violet-400 bg-violet-500/20',
          }));
          this.folders.set(mapped);
        }
      },
      error: () => {},
    });

    this.chatService.getRepositoryFiles(this.workspaceId).subscribe({
      next: (dbFiles) => {
        if (dbFiles && dbFiles.length > 0) {
          const mappedFiles: RepositoryFileItem[] = dbFiles.map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category || 'other',
            folderName: item.folder ? item.folder.name : 'General',
            size: item.size || '1.0 MB',
            uploaderName: item.uploaderName || 'User',
            uploadedAt: new Date(item.createdAt).toLocaleDateString(),
            thumbnailUrl: item.url,
            isPinned: !!item.isPinned,
            isRecent: true,
            downloadUrl: item.url,
          }));
          this.files.set(mappedFiles);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  filteredFiles = computed(() => {
    let list = this.files();
    const query = this.searchQuery().toLowerCase().trim();
    const tab = this.activeTab();
    const folderFilter = this.selectedFolderFilter();

    if (query) {
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.uploaderName.toLowerCase().includes(query) ||
          f.folderName.toLowerCase().includes(query),
      );
    }

    if (folderFilter) {
      list = list.filter((f) => f.folderName === folderFilter);
    }

    if (tab === 'images') {
      list = list.filter((f) => f.category === 'images');
    } else if (tab === 'documents') {
      list = list.filter((f) => f.category === 'documents');
    } else if (tab === 'videos') {
      list = list.filter((f) => f.category === 'videos');
    } else if (tab === 'recent') {
      list = list.filter((f) => f.isRecent);
    } else if (tab === 'pinned') {
      list = list.filter((f) => f.isPinned);
    }

    return list;
  });

  togglePin(fileId: string): void {
    this.files.update((items) =>
      items.map((item) => (item.id === fileId ? { ...item, isPinned: !item.isPinned } : item)),
    );
    this.chatService.togglePinRepositoryFile(this.workspaceId, fileId).subscribe({
      error: () => {},
    });
  }

  selectFolder(folderName: string | null): void {
    this.selectedFolderFilter.set(folderName);
    this.activeTab.set('all');
  }
}
