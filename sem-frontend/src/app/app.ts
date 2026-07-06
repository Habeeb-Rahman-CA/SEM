import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Item, ItemService } from './services/item.service';

interface Toast {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private itemService = inject(ItemService);

  // State Signals
  items = signal<Item[]>([]);
  isLoading = signal<boolean>(true);
  searchQuery = signal<string>('');
  activeFilter = signal<'all' | 'pending' | 'completed'>('all');
  
  // Modal Signals
  isAddModalOpen = signal<boolean>(false);
  isEditModalOpen = signal<boolean>(false);
  
  // Form Signals/Values
  newTitle = '';
  newDescription = '';
  
  editingItemId = '';
  editingTitle = '';
  editingDescription = '';
  editingIsCompleted = false;

  // Toast Signal
  toast = signal<Toast>({ message: '', type: 'success', visible: false });

  // Computed Stats
  totalItems = computed(() => this.items().length);
  completedItemsCount = computed(() => this.items().filter(item => item.isCompleted).length);
  pendingItemsCount = computed(() => this.items().filter(item => !item.isCompleted).length);
  completionPercentage = computed(() => {
    const total = this.totalItems();
    if (total === 0) return 0;
    return Math.round((this.completedItemsCount() / total) * 100);
  });

  // Filtered Items
  filteredItems = computed(() => {
    let list = this.items();

    // Apply Filter Tab
    if (this.activeFilter() === 'completed') {
      list = list.filter(item => item.isCompleted);
    } else if (this.activeFilter() === 'pending') {
      list = list.filter(item => !item.isCompleted);
    }

    // Apply Search Query
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      list = list.filter(item => 
        item.title.toLowerCase().includes(query) || 
        (item.description && item.description.toLowerCase().includes(query))
      );
    }

    return list;
  });

  ngOnInit() {
    this.fetchItems();
  }

  fetchItems() {
    this.isLoading.set(true);
    this.itemService.getItems().subscribe({
      next: (data) => {
        this.items.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.showToast('Failed to load items. Is the backend running?', 'error');
        this.isLoading.set(false);
      }
    });
  }

  toggleItemStatus(item: Item) {
    const updatedStatus = !item.isCompleted;
    this.itemService.updateItem(item.id, { isCompleted: updatedStatus }).subscribe({
      next: (updatedItem) => {
        this.items.update(prev => 
          prev.map(i => i.id === item.id ? updatedItem : i)
        );
        this.showToast(
          `Item marked as ${updatedStatus ? 'completed' : 'pending'}`, 
          'success'
        );
      },
      error: (err) => {
        console.error(err);
        this.showToast('Failed to update status', 'error');
      }
    });
  }

  openAddModal() {
    this.newTitle = '';
    this.newDescription = '';
    this.isAddModalOpen.set(true);
  }

  closeAddModal() {
    this.isAddModalOpen.set(false);
  }

  addNewItem() {
    if (!this.newTitle.trim()) return;

    this.itemService.createItem({
      title: this.newTitle.trim(),
      description: this.newDescription.trim() || undefined,
      isCompleted: false
    }).subscribe({
      next: (newItem) => {
        this.items.update(prev => [newItem, ...prev]);
        this.closeAddModal();
        this.showToast('Item created successfully', 'success');
      },
      error: (err) => {
        console.error(err);
        this.showToast('Failed to create item', 'error');
      }
    });
  }

  openEditModal(item: Item) {
    this.editingItemId = item.id;
    this.editingTitle = item.title;
    this.editingDescription = item.description || '';
    this.editingIsCompleted = item.isCompleted;
    this.isEditModalOpen.set(true);
  }

  closeEditModal() {
    this.isEditModalOpen.set(false);
  }

  updateItem() {
    if (!this.editingTitle.trim()) return;

    this.itemService.updateItem(this.editingItemId, {
      title: this.editingTitle.trim(),
      description: this.editingDescription.trim() || undefined,
      isCompleted: this.editingIsCompleted
    }).subscribe({
      next: (updatedItem) => {
        this.items.update(prev => 
          prev.map(i => i.id === this.editingItemId ? updatedItem : i)
        );
        this.closeEditModal();
        this.showToast('Item updated successfully', 'success');
      },
      error: (err) => {
        console.error(err);
        this.showToast('Failed to update item', 'error');
      }
    });
  }

  deleteItem(id: string) {
    if (confirm('Are you sure you want to delete this item?')) {
      this.itemService.deleteItem(id).subscribe({
        next: () => {
          this.items.update(prev => prev.filter(i => i.id !== id));
          this.showToast('Item deleted successfully', 'success');
        },
        error: (err) => {
          console.error(err);
          this.showToast('Failed to delete item', 'error');
        }
      });
    }
  }

  setFilter(filter: 'all' | 'pending' | 'completed') {
    this.activeFilter.set(filter);
  }

  showToast(message: string, type: 'success' | 'error') {
    this.toast.set({ message, type, visible: true });
    setTimeout(() => {
      this.toast.update(t => ({ ...t, visible: false }));
    }, 3000);
  }
}
