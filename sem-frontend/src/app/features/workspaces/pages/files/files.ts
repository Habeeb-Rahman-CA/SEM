import {
  Component,
  input,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Workspace,
  WorkspaceFile,
  WorkspaceFileVersion,
  WorkspaceService,
  FileAccessLevel,
} from '../../services/workspace.service';
import { UiService } from '../../../../core/services/ui.service';
import { SocketService } from '../../../../core/services/socket.service';
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
  selectedTab = signal<string>('all'); // 'all' | 'folders' | 'images' | 'documents' | 'other'
  selectedTagFilter = signal<string>('all');
  currentFolderPath = signal<string>('/');
  isUploading = signal<boolean>(false);

  // Compression config
  compressOnClient = signal<boolean>(true);
  compressOnServer = signal<boolean>(true);
  compressionQuality = signal<number>(0.8);

  // Rename states
  renamingFileId = signal<string | null>(null);
  renamingName = signal<string>('');

  // Folder states
  isCreateFolderModalOpen = signal<boolean>(false);
  newFolderName = signal<string>('');

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
  newTagInput = signal<string>('');

  // Folder Breadcrumbs
  folderBreadcrumbs = computed(() => {
    const path = this.currentFolderPath();
    const parts = path.split('/').filter(Boolean);
    const crumbs = [{ name: 'Root Repository 📁', path: '/' }];
    let acc = '';
    for (const p of parts) {
      acc += `/${p}`;
      crumbs.push({ name: p, path: `${acc}/` });
    }
    return crumbs;
  });

  // All Unique Tags in Workspace
  allTags = computed(() => {
    const set = new Set<string>();
    for (const f of this.files()) {
      if (f.tags) {
        for (const t of f.tags) {
          if (t.trim()) set.add(t.trim());
        }
      }
    }
    return Array.from(set);
  });

  // Filtered files & folders
  filteredFiles = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const tab = this.selectedTab();
    const tagFilter = this.selectedTagFilter();
    const folder = this.currentFolderPath();
    let list = this.files();

    // If searching globally, include all files, else filter by current folder
    if (!query) {
      list = list.filter((f) => {
        const fileFolder = f.folderPath || '/';
        return fileFolder === folder || (f.isFolder && fileFolder.startsWith(folder));
      });
    }

    if (query) {
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          (f.tags && f.tags.some((t) => t.toLowerCase().includes(query))),
      );
    }

    if (tagFilter !== 'all') {
      list = list.filter((f) => f.tags && f.tags.includes(tagFilter));
    }

    if (tab === 'folders') {
      list = list.filter((f) => f.isFolder || f.mimeType === 'folder');
    } else if (tab === 'images') {
      list = list.filter((f) => f.mimeType.startsWith('image/'));
    } else if (tab === 'documents') {
      list = list.filter(
        (f) =>
          f.mimeType.includes('pdf') ||
          f.mimeType.includes('word') ||
          f.mimeType.includes('spreadsheet') ||
          f.mimeType.includes('excel') ||
          f.mimeType.includes('sheet') ||
          f.mimeType.includes('text') ||
          f.mimeType.includes('csv'),
      );
    } else if (tab === 'other') {
      list = list.filter(
        (f) =>
          !f.isFolder &&
          !f.mimeType.startsWith('image/') &&
          !f.mimeType.includes('pdf') &&
          !f.mimeType.includes('word') &&
          !f.mimeType.includes('spreadsheet') &&
          !f.mimeType.includes('excel') &&
          !f.mimeType.includes('sheet') &&
          !f.mimeType.includes('text') &&
          !f.mimeType.includes('csv'),
      );
    }

    return list;
  });

  constructor() {
    effect(() => {
      const ws = this.workspace();
      if (ws) {
        this.loadFiles(ws.id);
      }
    });

    effect(() => {
      const fileId = this.selectedFileId();
      const list = this.files();
      if (fileId && list.length > 0) {
        const found = list.find((f) => f.id === fileId);
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

    this.socketService.onFileScanned((data: any) => {
      this.files.update((prev) =>
        prev.map((f) => {
          if (f.id === data.fileId) {
            return {
              ...f,
              virusScanStatus: data.status,
              virusScanDetails: data.details,
            };
          }
          return f;
        }),
      );

      const activeFile = this.selectedFile();
      if (activeFile && activeFile.id === data.fileId) {
        this.loadVersionHistory(activeFile);
      }

      if (data.status === 'infected') {
        this.uiService.error(
          `Virus scanner flagged file "${data.filename}" as infected! Placed in quarantine.`,
        );
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
      },
    });
  }

  // ── Folder Navigation & Creation ───────────────────────────────────────────
  navigateToFolder(path: string) {
    this.currentFolderPath.set(path);
  }

  openCreateFolderModal() {
    this.newFolderName.set('');
    this.isCreateFolderModalOpen.set(true);
  }

  closeCreateFolderModal() {
    this.isCreateFolderModalOpen.set(false);
    this.newFolderName.set('');
  }

  createFolder() {
    const name = this.newFolderName().trim();
    const ws = this.workspace();
    if (!ws || !name) return;

    this.workspaceService.createFolder(ws.id, name, this.currentFolderPath()).subscribe({
      next: (folder) => {
        this.files.update((prev) => [folder, ...prev]);
        this.uiService.success(`Folder "${name}" created.`);
        this.closeCreateFolderModal();
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to create folder.');
      },
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
                const compressedFile = new File(
                  [blob],
                  file.name.replace(/\.[^/.]+$/, '') + '.jpg',
                  {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  },
                );
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            quality,
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

    if (this.compressOnClient() && isImage) {
      this.uiService.info('Compressing image on client-side...');
      fileToUpload = await this.compressImage(fileToUpload, this.compressionQuality());
    }

    this.workspaceService
      .uploadWorkspaceFile(ws.id, fileToUpload, this.compressOnServer(), this.compressionQuality())
      .subscribe({
        next: (newFile) => {
          // Set folder path to current folder
          if (this.currentFolderPath() !== '/') {
            this.workspaceService
              .updateFileMetadata(ws.id, newFile.id, {
                folderPath: this.currentFolderPath(),
              })
              .subscribe({
                next: (updated) => {
                  this.files.update((prev) => [updated, ...prev]);
                },
              });
          } else {
            this.files.update((prev) => [newFile, ...prev]);
          }

          this.isUploading.set(false);
          this.uiService.success(`"${fileToUpload.name}" uploaded. Virus scanning in progress...`);
          input.value = '';
        },
        error: (err) => {
          this.isUploading.set(false);
          this.uiService.error(err.error?.message ?? 'Failed to upload file.');
          input.value = '';
        },
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

    this.workspaceService
      .uploadWorkspaceFileVersion(
        ws.id,
        fileId,
        fileToUpload,
        this.compressOnServer(),
        this.compressionQuality(),
      )
      .subscribe({
        next: (updatedFile) => {
          this.files.update((prev) => prev.map((f) => (f.id === fileId ? updatedFile : f)));
          this.isUploading.set(false);
          this.uiService.success(`New version of "${updatedFile.name}" uploaded. Scanning...`);
          input.value = '';
          this.loadVersionHistory(updatedFile);
        },
        error: (err) => {
          this.isUploading.set(false);
          this.isLoadingVersions.set(false);
          this.uiService.error(err.error?.message ?? 'Failed to upload new version.');
          input.value = '';
        },
      });
  }

  // ── Tagging & Metadata ─────────────────────────────────────────────────────
  addTag(file: WorkspaceFile, tagText: string) {
    const ws = this.workspace();
    const tag = tagText.trim().toLowerCase();
    if (!ws || !tag) return;

    const currentTags = file.tags || [];
    if (currentTags.includes(tag)) return;

    const newTags = [...currentTags, tag];

    this.workspaceService.updateFileMetadata(ws.id, file.id, { tags: newTags }).subscribe({
      next: (updated) => {
        this.files.update((prev) => prev.map((f) => (f.id === file.id ? updated : f)));
        if (this.previewFile()?.id === file.id) this.previewFile.set(updated);
        this.newTagInput.set('');
        this.uiService.success(`Tag #${tag} added.`);
      },
    });
  }

  removeTag(file: WorkspaceFile, tagToRemove: string) {
    const ws = this.workspace();
    if (!ws || !file.tags) return;

    const newTags = file.tags.filter((t) => t !== tagToRemove);

    this.workspaceService.updateFileMetadata(ws.id, file.id, { tags: newTags }).subscribe({
      next: (updated) => {
        this.files.update((prev) => prev.map((f) => (f.id === file.id ? updated : f)));
        if (this.previewFile()?.id === file.id) this.previewFile.set(updated);
        this.uiService.info(`Tag #${tagToRemove} removed.`);
      },
    });
  }

  updateFileAccess(file: WorkspaceFile, accessLevel: FileAccessLevel) {
    const ws = this.workspace();
    if (!ws) return;

    this.workspaceService.updateFileMetadata(ws.id, file.id, { accessLevel }).subscribe({
      next: (updated) => {
        this.files.update((prev) => prev.map((f) => (f.id === file.id ? updated : f)));
        if (this.previewFile()?.id === file.id) this.previewFile.set(updated);
        this.uiService.success(`Access level changed to ${accessLevel}.`);
      },
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
        this.files.update((prev) => prev.map((f) => (f.id === file.id ? updated : f)));
        this.uiService.success(`File renamed to "${newName}".`);
        this.cancelRename();
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to rename file.');
        this.cancelRename();
      },
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
      type: 'danger',
    });

    if (!confirmed) return;

    const originalList = this.files();
    this.files.update((prev) => prev.filter((f) => f.id !== file.id));

    this.workspaceService.deleteWorkspaceFile(ws.id, file.id).subscribe({
      next: () => {
        this.uiService.success(`"${file.name}" deleted successfully.`);
      },
      error: (err) => {
        this.files.set(originalList);
        this.uiService.error(err.error?.message ?? 'Failed to delete file.');
      },
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
      },
    });
  }

  closeVersionModal() {
    this.isVersionModalOpen.set(false);
    this.selectedFile.set(null);
    this.versionHistory.set([]);
  }

  // File Previews
  openPreview(file: WorkspaceFile) {
    if (file.isFolder) {
      this.navigateToFolder(`${this.currentFolderPath()}${file.name}/`);
      return;
    }

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
        error: () => {
          this.previewTextContent.set('Failed to read file preview content.');
          this.isLoadingPreview.set(false);
        },
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
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  getFileIconClass(mimeType: string, filename: string, isFolder?: boolean): string {
    if (isFolder || mimeType === 'folder') return 'fi-sr-folder text-amber-400';
    const lower = (mimeType || '').toLowerCase();
    if (lower.startsWith('image/')) return 'fi-rr-picture text-cyan-400';
    if (lower.includes('pdf')) return 'fi-rr-file-pdf text-rose-500';
    if (lower.includes('word') || filename.endsWith('.doc') || filename.endsWith('.docx'))
      return 'fi-rr-file-word text-blue-500';
    if (
      lower.includes('spreadsheet') ||
      lower.includes('excel') ||
      filename.endsWith('.xls') ||
      filename.endsWith('.xlsx') ||
      filename.endsWith('.csv')
    ) {
      return 'fi-rr-file-excel text-emerald-500';
    }
    if (lower.startsWith('text/') || filename.endsWith('.txt'))
      return 'fi-rr-file-edit text-slate-400';
    return 'fi-rr-document text-slate-400';
  }
}
