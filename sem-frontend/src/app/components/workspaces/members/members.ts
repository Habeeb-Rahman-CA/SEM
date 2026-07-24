import { Component, input, model, computed, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Workspace, WorkspaceMember, WorkspaceService } from '../../../services/workspace.service';
import { UiService } from '../../../services/ui.service';
import { AuthService } from '../../../services/auth.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar';
import { BulkImportComponent, BulkImportFieldMapping } from '../../../shared/components/bulk-import/bulk-import';
import { roleBadgeClass, PaginatorComponent } from '../../../shared';

@Component({
  selector: 'app-workspace-members',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarComponent, BulkImportComponent, PaginatorComponent],
  templateUrl: './members.html',
})
export class WorkspaceMembersComponent {
  memberImportMapping: BulkImportFieldMapping = {
    titleKey: 'username',
    detailKey: 'role',
    detailLabel: 'Role',
  };

  private workspaceService = inject(WorkspaceService);
  private uiService = inject(UiService);
  authService = inject(AuthService);

  workspace = input.required<Workspace | null>();
  members = model<WorkspaceMember[]>([]);
  assignableRoles = input<any[]>([]);

  canInvite = input<boolean>(false);
  canUpdate = input<boolean>(false);
  canRemove = input<boolean>(false);

  // Search filter, role filter, sort order, and pagination
  memberSearchQuery = signal<string>('');
  selectedRoleFilter = signal<string>('all');
  sortOrder = signal<string>('name-asc');
  page = signal<number>(1);
  pageSize = signal<number>(10);

  filteredMembers = computed(() => {
    const query = this.memberSearchQuery().toLowerCase().trim();
    let list = this.members();

    // 1. Filter by Search Query
    if (query) {
      list = list.filter(m =>
        m.user.username.toLowerCase().includes(query) ||
        m.role.name.toLowerCase().includes(query)
      );
    }

    // 2. Filter by Role
    const roleFilter = this.selectedRoleFilter();
    if (roleFilter !== 'all') {
      list = list.filter(m => m.role.slug === roleFilter);
    }

    // 3. Sort
    const sort = this.sortOrder();
    list = [...list].sort((a, b) => {
      if (sort === 'name-asc') {
        return a.user.username.localeCompare(b.user.username);
      } else if (sort === 'name-desc') {
        return b.user.username.localeCompare(a.user.username);
      } else if (sort === 'joined-newest') {
        return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
      } else if (sort === 'joined-oldest') {
        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      }
      return 0;
    });

    return list;
  });

  paginatedMembers = computed(() => {
    const list = this.filteredMembers();
    const startIndex = (this.page() - 1) * this.pageSize();
    return list.slice(startIndex, startIndex + this.pageSize());
  });

  constructor() {
    effect(() => {
      this.memberSearchQuery();
      this.selectedRoleFilter();
      this.sortOrder();
      this.page.set(1);
    }, { allowSignalWrites: true });
  }



  // Invitation Form state
  inviteUsername = signal<string>('');
  inviteRole = signal<string>('viewer');
  isInviting = signal<boolean>(false);
  inviteError = signal<string>('');
  inviteSuccess = signal<string>('');

  // Bulk Import state
  isMemberBulkModalOpen = signal<boolean>(false);
  memberBulkImportPassword = signal<string>('');
  showBulkImportPassword = signal<boolean>(false);
  memberBulkImportError = signal<string>('');
  memberBulkImportSuccess = signal<string>('');
  isImportingMemberBulk = signal<boolean>(false);
  memberBulkImportProgress = signal<number>(0);
  bulkImportMembersList = signal<any[]>([]);

  // Share link state
  isCopied = signal(false);

  getInviteLink(): string {
    return `${window.location.origin}/workspaces/join?id=${this.workspace()?.id}`;
  }

  getQrCodeUrl(): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=222831&bgcolor=EEEEEE&data=${encodeURIComponent(this.getInviteLink())}`;
  }

  copyInviteLink() {
    navigator.clipboard.writeText(this.getInviteLink());
    this.isCopied.set(true);
    setTimeout(() => this.isCopied.set(false), 2000);
  }

  roleBadgeClass = roleBadgeClass;


  onInvite() {
    const username = this.inviteUsername().trim();
    const roleSlug = this.inviteRole();
    const ws = this.workspace();
    if (!ws || !username) return;

    this.isInviting.set(true);
    this.inviteError.set('');
    this.inviteSuccess.set('');

    this.workspaceService.inviteMember(ws.id, username, roleSlug).subscribe({
      next: (newMember) => {
        this.isInviting.set(false);
        this.inviteSuccess.set(`${username} has been invited successfully!`);
        this.inviteUsername.set('');
        // Reload members list
        this.loadMembers(ws.id);
      },
      error: (err) => {
        this.isInviting.set(false);
        this.inviteError.set(err.error?.message ?? 'Failed to invite user.');
      }
    });
  }

  onUpdateRole(member: WorkspaceMember, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newRoleSlug = select.value;
    const ws = this.workspace();
    if (!ws) return;

    const originalRole = member.role;

    // Optimistic Update
    this.members.update(prev => prev.map(m => m.id === member.id ? { ...m, role: { ...m.role, slug: newRoleSlug } } : m));

    this.workspaceService.updateMemberRole(ws.id, member.userId, newRoleSlug).subscribe({
      next: (updated) => {
        this.members.update(prev => prev.map(m => m.id === member.id ? { ...m, role: updated.role } : m));
        this.uiService.success(`Role for ${member.user.username} updated to ${updated.role.name}.`);
      },
      error: (err) => {
        // Rollback
        this.members.update(prev => prev.map(m => m.id === member.id ? { ...m, role: originalRole } : m));
        select.value = originalRole?.slug ?? '';
        this.uiService.error(err.error?.message ?? 'Failed to update member role.');
      }
    });
  }

  async onRemoveMember(member: WorkspaceMember) {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Remove Member',
      message: `Remove "${member.user.username}" from this workspace?`,
      confirmText: 'Remove',
      type: 'danger',
    });
    if (!confirmed) return;

    const originalMembers = this.members();

    // Optimistic Update
    this.members.update(prev => prev.filter(m => m.userId !== member.userId));

    this.workspaceService.removeMember(ws.id, member.userId).subscribe({
      next: () => {
        this.uiService.success(`Removed "${member.user.username}" from workspace.`);
      },
      error: (err) => {
        // Rollback
        this.members.set(originalMembers);
        this.uiService.error(err.error?.message ?? 'Failed to remove member.');
      },
    });
  }

  loadMembers(workspaceId: string) {
    this.workspaceService.getMembers(workspaceId).subscribe({
      next: (members: WorkspaceMember[]) => this.members.set(members),
      error: (err: any) => console.error('Failed to load members', err)
    });
  }

  // Bulk Import methods
  openMemberBulkModal() {
    this.bulkImportMembersList.set([]);
    this.memberBulkImportPassword.set('');
    this.memberBulkImportError.set('');
    this.memberBulkImportSuccess.set('');
    this.showBulkImportPassword.set(false);
    this.isMemberBulkModalOpen.set(true);
  }

  closeMemberBulkModal() {
    this.isMemberBulkModalOpen.set(false);
  }

  async downloadMemberTemplate() {
    try {
      const XLSX = await import('xlsx-js-style') as any;
      const ws: any = {
        '!ref': 'A1:B3',
        'A1': { v: 'Username', t: 's', s: { font: { bold: true } } },
        'B1': { v: 'Role', t: 's', s: { font: { bold: true } } },
        'A2': { v: '#Required', t: 's', s: { font: { color: { rgb: '4B525D' } } } },
        'B2': { v: '#Optional (defaults to viewer)', t: 's', s: { font: { color: { rgb: '4B525D' } } } },
        'A3': { v: 'eg. john_doe', t: 's', s: { font: { italic: true } } },
        'B3': { v: 'eg. referee', t: 's', s: { font: { italic: true } } }
      };
      ws['!cols'] = [
        { wch: 32 },
        { wch: 25 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Members Template');
      XLSX.writeFile(wb, 'members_import_template.xlsx');
    } catch (err) {
      console.error('Failed to generate template', err);
    }
  }

  onMembersExcelParsed(json: any[]) {
    const parsedMembers = json.map((row: any) => {
      const usernameKey = Object.keys(row).find(k => k.toLowerCase() === 'username') || 'Username';
      const roleKey = Object.keys(row).find(k => k.toLowerCase() === 'role') || 'Role';

      const username = (row[usernameKey] || '').toString().trim();
      const role = (row[roleKey] || '').toString().trim();

      let status = 'pending';
      let error = '';

      if (!username) {
        status = 'failed';
        error = 'Username is missing';
      } else {
        const lowerUser = username.toLowerCase();
        if (lowerUser.startsWith('#required') || lowerUser === 'required') {
          return null;
        }
        if (lowerUser.startsWith('eg.')) {
          return null;
        }
        const alreadyExists = this.members().some(m => m.user.username.toLowerCase() === lowerUser);
        if (alreadyExists) {
          status = 'exist';
          error = 'Already a member';
        }
      }

      return {
        username,
        role: role || undefined,
        status,
        error
      };
    }).filter(Boolean) as any[];

    this.bulkImportMembersList.set(parsedMembers);
    this.memberBulkImportError.set('');
    if (parsedMembers.length === 0) {
      this.memberBulkImportError.set('No valid members found in the spreadsheet. Make sure you have a "Username" column.');
    }
  }

  onConfirmMemberBulkImport() {
    const ws = this.workspace();
    const membersToImport = [...this.bulkImportMembersList()];
    const password = this.memberBulkImportPassword();

    if (!ws || membersToImport.length === 0) return;
    if (!password) {
      this.memberBulkImportError.set('Common password is required for registering new accounts.');
      return;
    }
    if (password.length < 6) {
      this.memberBulkImportError.set('Password must be at least 6 characters long.');
      return;
    }
    if (!/^(?=.*[A-Z])(?=.*\d).+$/.test(password)) {
      this.memberBulkImportError.set('Password must contain at least one uppercase letter and one number.');
      return;
    }

    this.isImportingMemberBulk.set(true);
    this.memberBulkImportProgress.set(0);
    this.memberBulkImportError.set('');
    this.memberBulkImportSuccess.set('');

    const payload = {
      password,
      members: membersToImport.map(m => ({
        username: m.username,
        role: m.role
      }))
    };

    this.workspaceService.bulkImportMembers(ws.id, payload).subscribe({
      next: (res) => {
        this.isImportingMemberBulk.set(false);
        this.memberBulkImportProgress.set(100);

        let successCount = 0;
        let failCount = 0;

        membersToImport.forEach(item => {
          const successItem = res.success.find((s: any) => s.username.toLowerCase() === item.username.toLowerCase());
          const failedItem = res.failed.find((f: any) => f.username.toLowerCase() === item.username.toLowerCase());

          if (successItem) {
            item.status = 'success';
            item.error = '';
            successCount++;
          } else if (failedItem) {
            item.status = 'failed';
            item.error = failedItem.error;
            failCount++;
          }
        });

        this.bulkImportMembersList.set([...membersToImport]);

        if (failCount === 0) {
          this.memberBulkImportSuccess.set(`Successfully imported all ${successCount} members!`);
        } else {
          this.memberBulkImportSuccess.set(`Import finished: ${successCount} successful, ${failCount} failed.`);
        }

        this.loadMembers(ws.id);
      },
      error: (err) => {
        this.isImportingMemberBulk.set(false);
        this.memberBulkImportError.set(err.error?.message ?? 'Bulk import failed.');
      }
    });
  }
}
