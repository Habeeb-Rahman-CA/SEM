import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SearchInputComponent } from '../../../../shared';

@Component({
  selector: 'app-inventory-toolbar',
  standalone: true,
  imports: [FormsModule, SearchInputComponent],
  templateUrl: './inventory-toolbar.html',
})
export class InventoryToolbarComponent {
  filteredCount = input.required<number>();
  totalCount = input.required<number>();
  categories = input.required<string[]>();
  filterCategory = input.required<string>();
  filterStatus = input.required<string>();
  searchQuery = input.required<string>();

  filterCategoryChange = output<string>();
  filterStatusChange = output<string>();
  searchQueryChange = output<string>();
}
