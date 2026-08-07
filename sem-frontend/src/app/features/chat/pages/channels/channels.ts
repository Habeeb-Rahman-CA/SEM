import {
  Component,
  OnInit,
  input,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, Channel, ChannelMember, CreateChannelDto } from '../../services/chat.service';
import { WorkspaceMember } from '../../../workspaces/services/workspace.service';

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './channels.html',
  styleUrl: './channels.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelsComponent implements OnInit {
  private chatService = inject(ChatService);

  workspaceId = input.required<string>();
  members = input<WorkspaceMember[]>([]);

  channels = signal<Channel[]>([]);
  isLoading = signal<boolean>(true);
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('all');

  // Modal State
  isCreateModalOpen = signal<boolean>(false);
  isDetailModalOpen = signal<boolean>(false);
  selectedChannel = signal<Channel | null>(null);

  // Form State
  newChannel = signal<CreateChannelDto>({
    name: '',
    description: '',
    category: 'custom',
    icon: 'fi fi-rr-hashtag',
    accessType: 'public',
    postingPermission: 'all_members',
    initialMemberUserIds: [],
  });

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Icon options following Flaticon policy
  iconOptions = [
    { label: 'Hashtag', class: 'fi fi-rr-hashtag' },
    { label: 'Chat Comments', class: 'fi fi-rr-comments' },
    { label: 'Megaphone', class: 'fi fi-rr-megaphone' },
    { label: 'User Gear', class: 'fi fi-rr-user-gear' },
    { label: 'Whistle (Referee)', class: 'fi fi-rr-whistle' },
    { label: 'Handshake (Volunteer)', class: 'fi fi-rr-heart-partner-handshake' },
    { label: 'Form (Registration)', class: 'fi fi-rr-form' },
    { label: 'Sliders (Technical)', class: 'fi fi-rr-settings-sliders' },
    { label: 'Dollar (Finance)', class: 'fi fi-rr-dollar' },
    { label: 'Bullhorn (Marketing)', class: 'fi fi-rr-bullhorn' },
    { label: 'Cross (Medical)', class: 'fi fi-rr-cross' },
    { label: 'Lock (Private)', class: 'fi fi-rr-lock' },
  ];

  // Preset Channels to quickly add if missing
  presetTemplates = [
    {
      name: 'General',
      category: 'default',
      accessType: 'public',
      postingPermission: 'all_members',
      icon: 'fi fi-rr-comments',
    },
    {
      name: 'Announcements',
      category: 'default',
      accessType: 'public',
      postingPermission: 'admin_only_posting',
      icon: 'fi fi-rr-megaphone',
    },
    {
      name: 'Organizers',
      category: 'operations',
      accessType: 'private',
      postingPermission: 'all_members',
      icon: 'fi fi-rr-user-gear',
    },
    {
      name: 'Referees',
      category: 'departments',
      accessType: 'public',
      postingPermission: 'all_members',
      icon: 'fi fi-rr-whistle',
    },
    {
      name: 'Volunteers',
      category: 'departments',
      accessType: 'public',
      postingPermission: 'all_members',
      icon: 'fi fi-rr-heart-partner-handshake',
    },
    {
      name: 'Registration Team',
      category: 'departments',
      accessType: 'public',
      postingPermission: 'all_members',
      icon: 'fi fi-rr-form',
    },
    {
      name: 'Technical Team',
      category: 'departments',
      accessType: 'public',
      postingPermission: 'all_members',
      icon: 'fi fi-rr-settings-sliders',
    },
    {
      name: 'Finance',
      category: 'departments',
      accessType: 'private',
      postingPermission: 'all_members',
      icon: 'fi fi-rr-dollar',
    },
    {
      name: 'Marketing',
      category: 'departments',
      accessType: 'public',
      postingPermission: 'all_members',
      icon: 'fi fi-rr-bullhorn',
    },
    {
      name: 'Medical Team',
      category: 'departments',
      accessType: 'private',
      postingPermission: 'all_members',
      icon: 'fi fi-rr-cross',
    },
  ];

  // Computed Counters
  totalCount = computed(() => this.channels().length);
  publicCount = computed(() => this.channels().filter((c) => c.accessType === 'public').length);
  privateCount = computed(() => this.channels().filter((c) => c.accessType === 'private').length);
  joinedCount = computed(() => this.channels().filter((c) => c.isJoined).length);

  // Computed Filtered Channels
  filteredChannels = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();

    return this.channels().filter((c) => {
      const matchesSearch =
        !query ||
        c.name.toLowerCase().includes(query) ||
        c.slug.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query));

      const matchesCat = cat === 'all' || (cat === 'joined' && c.isJoined) || c.category === cat;

      return matchesSearch && matchesCat;
    });
  });

  ngOnInit() {
    this.loadChannels();
  }

  loadChannels() {
    this.isLoading.set(true);
    this.chatService.getChannels(this.workspaceId()).subscribe({
      next: (data) => {
        this.channels.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load channels:', err);
        this.isLoading.set(false);
      },
    });
  }

  onCategorySelect(cat: string) {
    this.selectedCategory.set(cat);
  }

  openCreateModal(preset?: any) {
    this.errorMessage.set('');
    if (preset) {
      this.newChannel.set({
        name: preset.name,
        description: `${preset.name} discussion channel`,
        category: preset.category,
        icon: preset.icon,
        accessType: preset.accessType,
        postingPermission: preset.postingPermission,
        initialMemberUserIds: [],
      });
    } else {
      this.newChannel.set({
        name: '',
        description: '',
        category: 'custom',
        icon: 'fi fi-rr-hashtag',
        accessType: 'public',
        postingPermission: 'all_members',
        initialMemberUserIds: [],
      });
    }
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal() {
    this.isCreateModalOpen.set(false);
  }

  createChannel() {
    const dto = this.newChannel();
    if (!dto.name.trim()) {
      this.errorMessage.set('Channel name is required');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.chatService.createChannel(this.workspaceId(), dto).subscribe({
      next: (created) => {
        this.channels.update((prev) => [created, ...prev]);
        this.isSubmitting.set(false);
        this.isCreateModalOpen.set(false);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to create channel');
      },
    });
  }

  toggleJoin(channel: Channel) {
    if (channel.isJoined) {
      this.chatService.leaveChannel(this.workspaceId(), channel.id).subscribe({
        next: () => {
          this.channels.update((prev) =>
            prev.map((c) =>
              c.id === channel.id
                ? {
                    ...c,
                    isJoined: false,
                    memberCount: Math.max(0, (c.memberCount || 1) - 1),
                  }
                : c,
            ),
          );
        },
      });
    } else {
      this.chatService.joinChannel(this.workspaceId(), channel.id).subscribe({
        next: () => {
          this.channels.update((prev) =>
            prev.map((c) =>
              c.id === channel.id
                ? {
                    ...c,
                    isJoined: true,
                    memberCount: (c.memberCount || 0) + 1,
                  }
                : c,
            ),
          );
        },
      });
    }
  }

  openChannelDetail(channel: Channel) {
    this.selectedChannel.set(channel);
    this.isDetailModalOpen.set(true);
    this.chatService.getChannel(this.workspaceId(), channel.id).subscribe({
      next: (full) => this.selectedChannel.set(full),
    });
  }

  closeDetailModal() {
    this.isDetailModalOpen.set(false);
    this.selectedChannel.set(null);
  }

  deleteChannel(channel: Channel, event: Event) {
    event.stopPropagation();
    if (!confirm(`Are you sure you want to delete channel #${channel.name}?`)) {
      return;
    }

    this.chatService.deleteChannel(this.workspaceId(), channel.id).subscribe({
      next: () => {
        this.channels.update((prev) => prev.filter((c) => c.id !== channel.id));
      },
      error: (err) => {
        alert(err.error?.message || 'Cannot delete channel');
      },
    });
  }

  toggleInitialMember(userId: string) {
    const current = this.newChannel().initialMemberUserIds || [];
    if (current.includes(userId)) {
      this.newChannel.update((prev) => ({
        ...prev,
        initialMemberUserIds: current.filter((id) => id !== userId),
      }));
    } else {
      this.newChannel.update((prev) => ({
        ...prev,
        initialMemberUserIds: [...current, userId],
      }));
    }
  }
}
