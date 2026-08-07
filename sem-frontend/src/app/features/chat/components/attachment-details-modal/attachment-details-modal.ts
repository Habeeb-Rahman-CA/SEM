import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AttachmentFileDetails {
  id: string;
  name: string;
  url: string;
  sizeFormatted: string;
  uploaderName: string;
  uploaderRole?: string;
  createdAt: string;
  version: string;
  virusScanStatus: 'clean' | 'scanning' | 'flagged';
  category: 'image' | 'video' | 'audio' | 'pdf' | 'word' | 'excel' | 'zip' | 'apk' | 'file';
  versionHistory?: { version: string; name: string; date: string; uploader: string }[];
}

@Component({
  selector: 'app-attachment-details-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attachment-details-modal.html',
  styleUrls: ['./attachment-details-modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentDetailsModalComponent implements OnInit {
  @Input({ required: true }) attachment!: AttachmentFileDetails;
  @Output() close = new EventEmitter<void>();
  @Output() download = new EventEmitter<AttachmentFileDetails>();
  @Output() rename = new EventEmitter<{ id: string; newName: string }>();

  isEditingName = signal<boolean>(false);
  editedName = signal<string>('');
  activeTab = signal<'details' | 'versions'>('details');

  ngOnInit() {
    if (this.attachment) {
      this.editedName.set(this.attachment.name);
    }
  }

  saveRename() {
    const val = this.editedName().trim();
    if (!val || val === this.attachment.name) {
      this.isEditingName.set(false);
      return;
    }
    this.rename.emit({ id: this.attachment.id, newName: val });
    this.attachment.name = val;
    this.isEditingName.set(false);
  }

  onDownload() {
    this.download.emit(this.attachment);
    // Trigger browser download if URL is present
    if (this.attachment.url) {
      const a = document.createElement('a');
      a.href = this.attachment.url;
      a.download = this.attachment.name;
      a.click();
    }
  }
}
