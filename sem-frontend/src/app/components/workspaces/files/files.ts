import { Component, input, signal, computed, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Workspace, WorkspaceFile, WorkspaceFileVersion, WorkspaceService } from '../../../services/workspace.service';
import { UiService } from '../../../services/ui.service';
import { SocketService } from '../../../services/socket.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-workspace-files',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './files.html',
})
export class WorkspaceFilesComponent implements OnInit, OnDestroy {
  private workspaceService = inject(WorkspaceService);
  private uiService = inject(UiService);
  private socketService = inject(SocketService);
  private http = inject(HttpClient);

  // Inputs
  workspace = input.required<Workspace | null>();
  selectedFileId = input<string | null>(null);

  // State Signals
  files = signal<WorkspaceFile[]>([]);
  isLoading = signal<boolean>(false);
  searchQuery = signal<string>('');
  selectedTab = signal<string>('all'); // 'all' | 'images' | 'documents' | 'other'
  isUploading = signal<boolean>(false);

  // Compression config
  compressOnClient = signal<boolean>(true);
  compressOnServer = signal<boolean>(true);
  compressionQuality = signal<number>(0.8);

  // Rename states
  renamingFileId = signal<string | null>(null);
  renamingName = signal<string>('');

  // Version history states
  selectedFile = signal<WorkspaceFile | null>(null);
  versionHistory = signal<WorkspaceFileVersion[]>([]);
  isLoadingVersions = signal<boolean>(false);
  isVersionModalOpen = signal<boolean>(false);

  // Preview states
  previewFile = signal<WorkspaceFile | null>(null);
  isPreviewModalOpen = signal<boolean>(false);
  previewTextContent = signal<string>('');
  isLoadingPreview = signal<boolean>(false);

  // Filtered files
  filteredFiles = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const tab = this.selectedTab();
    let list = this.files();

    if (query) {
      list = list.filter(f => f.name.toLowerCase().includes(query));
    }

    if (tab === 'images') {
      list = list.filter(f => f.mimeType.startsWith('image/'));
    } else if (tab === 'documents') {
      list = list.filter(f =>
        f.mimeType.includes('pdf') ||
        f.mimeType.includes('word') ||
        f.mimeType.includes('spreadsheet') ||
        f.mimeType.includes('excel') ||
        f.mimeType.includes('sheet') ||
        f.mimeType.includes('text') ||
        f.mimeType.includes('csv')
      );
    } else if (tab === 'other') {
      list = list.filter(f =>
        !f.mimeType.startsWith('image/') &&
        !f.mimeType.includes('pdf') &&
        !f.mimeType.includes('word') &&
        !f.mimeType.includes('spreadsheet') &&
        !f.mimeType.includes('excel') &&
        !f.mimeType.includes('sheet') &&
        !f.mimeType.includes('text') &&
        !f.mimeType.includes('csv')
      );
    }

    return list;
  });

  constructor() {
    // Reload files whenever the active workspace changes
    effect(() => {
      const ws = this.workspace();
      if (ws) {
        this.loadFiles(ws.id);
      }
    });

    // Auto-open preview when a file is selected from global search
    effect(() => {
      const fileId = this.selectedFileId();
      const list = this.files();
      if (fileId && list.length > 0) {
        const found = list.find(f => f.id === fileId);
        if (found) {
          this.openPreview(found);
        }
      }
    });
  }

  ngOnInit() {
    const ws = this.workspace();
    if (ws) {
      this.socketService.subscribeWorkspace(ws.id);
      this.loadFiles(ws.id);
    }

    // Subscribe to background virus scanning complete events
    this.socketService.onFileScanned((data: any) => {
      // Update scan status dynamically
      this.files.update(prev => prev.map(f => {
        if (f.id === data.fileId) {
          return {
            ...f,
            virusScanStatus: data.status,
            virusScanDetails: data.details,
          };
        }
        return f;
      }));

      // Reload versions if open
      const activeFile = this.selectedFile();
      if (activeFile && activeFile.id === data.fileId) {
        this.loadVersionHistory(activeFile);
      }

      // Display warning/success toast
      if (data.status === 'infected') {
        this.uiService.error(`Virus scanner flagged file "${data.filename}" as infected! Placed in quarantine.`);
      } else {
        this.uiService.success(`File "${data.filename}" passed security check successfully.`);
      }
    });
  }

  ngOnDestroy() {
    const ws = this.workspace();
    if (ws) {
      this.socketService.unsubscribeWorkspace(ws.id);
    }
    this.socketService.offFileScanned();
  }

  loadFiles(workspaceId: string) {
    this.isLoading.set(true);
    this.workspaceService.getFiles(workspaceId).subscribe({
      next: (data) => {
        this.files.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load files', err);
        this.isLoading.set(false);
        this.uiService.error(err.error?.message ?? 'Failed to load files.');
      }
    });
  }

  // Frontend image compressor
  async compressImage(file: File, quality: number): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event: any) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Standard Max resolution boundaries
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1080;
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + '.jpg', {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = event.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  }

  // Handle File Upload
  async onFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const ws = this.workspace();
    if (!ws) return;

    let fileToUpload = input.files[0];
    const isImage = fileToUpload.type.startsWith('image/') && !fileToUpload.type.includes('svg');

    this.isUploading.set(true);

    // Apply client-side compression
    if (this.compressOnClient() && isImage) {
      this.uiService.info('Compressing image on client-side...');
      fileToUpload = await this.compressImage(fileToUpload, this.compressionQuality());
    }

    this.workspaceService.uploadWorkspaceFile(
      ws.id,
      fileToUpload,
      this.compressOnServer(),
      this.compressionQuality()
    ).subscribe({
      next: (newFile) => {
        this.files.update(prev => [newFile, ...prev]);
        this.isUploading.set(false);
        this.uiService.success(`"${fileToUpload.name}" uploaded. Virus scanning in progress...`);
        input.value = ''; // clear input
      },
      error: (err) => {
        this.isUploading.set(false);
        this.uiService.error(err.error?.message ?? 'Failed to upload file.');
        input.value = '';
      }
    });
  }

  // Handle Version Upload
  async onVersionUpload(event: Event, fileId: string) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const ws = this.workspace();
    if (!ws) return;

    let fileToUpload = input.files[0];
    const isImage = fileToUpload.type.startsWith('image/') && !fileToUpload.type.includes('svg');

    this.isLoadingVersions.set(true);
    this.isUploading.set(true);

    if (this.compressOnClient() && isImage) {
      fileToUpload = await this.compressImage(fileToUpload, this.compressionQuality());
    }

    this.workspaceService.uploadWorkspaceFileVersion(
      ws.id,
      fileId,
      fileToUpload,
      this.compressOnServer(),
      this.compressionQuality()
    ).subscribe({
      next: (updatedFile) => {
        // Update files list
        this.files.update(prev => prev.map(f => f.id === fileId ? updatedFile : f));
        this.isUploading.set(false);
        this.uiService.success(`New version of "${updatedFile.name}" uploaded. Scanning...`);
        input.value = '';

        // Update version history modal
        this.loadVersionHistory(updatedFile);
      },
      error: (err) => {
        this.isUploading.set(false);
        this.isLoadingVersions.set(false);
        this.uiService.error(err.error?.message ?? 'Failed to upload new version.');
        input.value = '';
      }
    });
  }

  // Rename File
  startRename(file: WorkspaceFile) {
    this.renamingFileId.set(file.id);
    this.renamingName.set(file.name);
  }

  cancelRename() {
    this.renamingFileId.set(null);
    this.renamingName.set('');
  }

  saveRename(file: WorkspaceFile) {
    const newName = this.renamingName().trim();
    const ws = this.workspace();
    if (!ws || !newName || newName === file.name) {
      this.cancelRename();
      return;
    }

    this.workspaceService.renameWorkspaceFile(ws.id, file.id, newName).subscribe({
      next: (updated) => {
        this.files.update(prev => prev.map(f => f.id === file.id ? updated : f));
        this.uiService.success(`File renamed to "${newName}".`);
        this.cancelRename();
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to rename file.');
        this.cancelRename();
      }
    });
  }

  // Delete File
  async onDeleteFile(file: WorkspaceFile) {
    const ws = this.workspace();
    if (!ws) return;

    const confirmed = await this.uiService.confirm({
      title: 'Delete File',
      message: `Are you sure you want to delete "${file.name}"? This will archive all historical versions.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) return;

    const originalList = this.files();
    // Optimistic Update
    this.files.update(prev => prev.filter(f => f.id !== file.id));

    this.workspaceService.deleteWorkspaceFile(ws.id, file.id).subscribe({
      next: () => {
        this.uiService.success(`"${file.name}" deleted successfully.`);
      },
      error: (err) => {
        this.files.set(originalList); // Rollback
        this.uiService.error(err.error?.message ?? 'Failed to delete file.');
      }
    });
  }

  // Load versions history
  openVersionHistory(file: WorkspaceFile) {
    this.selectedFile.set(file);
    this.versionHistory.set([]);
    this.isVersionModalOpen.set(true);
    this.loadVersionHistory(file);
  }

  loadVersionHistory(file: WorkspaceFile) {
    const ws = this.workspace();
    if (!ws) return;

    this.isLoadingVersions.set(true);
    this.workspaceService.getFileVersions(ws.id, file.id).subscribe({
      next: (versions) => {
        this.versionHistory.set(versions);
        this.isLoadingVersions.set(false);
      },
      error: (err) => {
        console.error('Failed to load version history', err);
        this.isLoadingVersions.set(false);
      }
    });
  }

  closeVersionModal() {
    this.isVersionModalOpen.set(false);
    this.selectedFile.set(null);
    this.versionHistory.set([]);
  }

  // File Previews
  openPreview(file: WorkspaceFile) {
    if (file.virusScanStatus === 'infected') {
      this.uiService.error('Cannot preview infected file. Quarantined for safety.');
      return;
    }

    this.previewFile.set(file);
    this.previewTextContent.set('');
    this.isPreviewModalOpen.set(true);

    const isText =
      file.mimeType.startsWith('text/') ||
      file.mimeType.includes('json') ||
      file.mimeType.includes('csv') ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.json');

    if (isText) {
      this.isLoadingPreview.set(true);
      this.http.get(file.url, { responseType: 'text' }).subscribe({
        next: (content) => {
          this.previewTextContent.set(content);
          this.isLoadingPreview.set(false);
        },
        error: (err) => {
          this.previewTextContent.set('Failed to read file preview content.');
          this.isLoadingPreview.set(false);
        }
      });
    }
  }

  closePreviewModal() {
    this.isPreviewModalOpen.set(false);
    this.previewFile.set(null);
    this.previewTextContent.set('');
  }

  // Helpers
  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  getFileIconClass(mimeType: string, filename: string): string {
    const lower = (mimeType || '').toLowerCase();
    if (lower.startsWith('image/')) return 'fi-rr-picture text-cyan-400';
    if (lower.includes('pdf')) return 'fi-rr-file-pdf text-rose-500';
    if (lower.includes('word') || filename.endsWith('.doc') || filename.endsWith('.docx')) return 'fi-rr-file-word text-blue-500';
    if (lower.includes('spreadsheet') || lower.includes('excel') || filename.endsWith('.xls') || filename.endsWith('.xlsx') || filename.endsWith('.csv')) {
      return 'fi-rr-file-excel text-emerald-500';
    }
    if (lower.startsWith('text/') || filename.endsWith('.txt')) return 'fi-rr-file-edit text-slate-400';
    return 'fi-rr-document text-slate-400';
  }
}
