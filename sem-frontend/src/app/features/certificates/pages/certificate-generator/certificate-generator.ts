import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  CertificateService,
  CertificateType,
  DigitalCertificate,
} from '../../services/certificate.service';
import { UiService } from '../../../../core/services/ui.service';
import { ConfettiService } from '../../../../core/services/confetti.service';
import { CopyButtonComponent } from '../../../../shared/components/copy-button/copy-button';

@Component({
  selector: 'app-certificate-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CopyButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './certificate-generator.html',
})
export class CertificateGeneratorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private certService = inject(CertificateService);
  private ui = inject(UiService);
  private confetti = inject(ConfettiService);

  workspaceId = signal<string>('');
  certificates = signal<DigitalCertificate[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  activeTab = signal<'issued' | 'auto-generate'>('issued');
  typeFilter = signal<CertificateType | 'all'>('all');
  searchQuery = signal('');

  // Certificate Modal State
  selectedCert = signal<DigitalCertificate | null>(null);
  isCertModalOpen = signal<boolean>(false);

  // Manual Generate Form State
  isCreateModalOpen = signal<boolean>(false);
  newRecipientName = signal('');
  newRecipientEmail = signal('');
  newCertType = signal<CertificateType>('participation');
  newEventName = signal('Taisen League Championship 2025');
  newPosition = signal('');

  filteredCertificates = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const type = this.typeFilter();
    return this.certificates().filter((c) => {
      if (
        q &&
        !c.recipientName.toLowerCase().includes(q) &&
        !c.code.toLowerCase().includes(q) &&
        !c.eventName.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (type !== 'all' && c.certificateType !== type) return false;
      return true;
    });
  });

  counts = computed(() => {
    const list = this.certificates();
    return {
      total: list.length,
      winners: list.filter((c) => c.certificateType === 'winners').length,
      participation: list.filter((c) => c.certificateType === 'participation').length,
      referee: list.filter((c) => c.certificateType === 'referee').length,
      volunteer: list.filter((c) => c.certificateType === 'volunteer').length,
      organizer: list.filter((c) => c.certificateType === 'organizer').length,
    };
  });

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      this.workspaceId.set(id);
      if (id) this.load();
    });
  }

  load() {
    this.isLoading.set(true);
    this.error.set(null);
    this.certService.list(this.workspaceId()).subscribe({
      next: (list) => {
        this.certificates.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load certificates');
        this.isLoading.set(false);
      },
    });
  }

  openCreateModal() {
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal() {
    this.isCreateModalOpen.set(false);
  }

  submitGenerate() {
    if (!this.newRecipientName().trim()) {
      this.ui.error('Please enter recipient name');
      return;
    }

    this.certService
      .generate(this.workspaceId(), {
        recipientName: this.newRecipientName(),
        recipientEmail: this.newRecipientEmail() || undefined,
        certificateType: this.newCertType(),
        eventName: this.newEventName(),
        position: this.newPosition() || undefined,
      })
      .subscribe({
        next: (cert) => {
          this.certificates.update((list) => [cert, ...list]);
          this.ui.success(`Certificate for "${cert.recipientName}" generated successfully!`);
          this.confetti.celebrate(
            'certificate_issued',
            'Certificate Issued!',
            `Digital Certificate generated for ${cert.recipientName}.`,
          );
          this.closeCreateModal();
          this.viewCertificate(cert);
        },
        error: (err) => {
          this.ui.error(err?.error?.message ?? 'Failed to generate certificate');
        },
      });
  }

  runAutoGenerateBatch(types?: CertificateType[]) {
    this.isLoading.set(true);
    this.certService
      .bulkGenerate(this.workspaceId(), {
        eventName: 'Taisen League Championship 2025',
        types,
      })
      .subscribe({
        next: (res) => {
          this.ui.success(
            `Successfully auto-generated ${res.generatedCount} digital certificates!`,
          );
          this.confetti.celebrate(
            'championship_won',
            'Batch Certificates Generated!',
            `Issued ${res.generatedCount} digital certificates across all categories.`,
          );
          this.load();
          this.activeTab.set('issued');
        },
        error: (err) => {
          this.ui.error(err?.error?.message ?? 'Failed auto-generating certificates');
          this.isLoading.set(false);
        },
      });
  }

  viewCertificate(cert: DigitalCertificate) {
    this.selectedCert.set(cert);
    this.isCertModalOpen.set(true);
  }

  closeCertModal() {
    this.isCertModalOpen.set(false);
  }

  copyVerificationLink(code: string) {
    const url = `${window.location.origin}/public/certificates/verify/${code}`;
    navigator.clipboard.writeText(url);
    this.ui.success('Certificate QR Verification link copied to clipboard!');
  }

  printCertificate() {
    window.print();
  }

  badgeClass(type: CertificateType): string {
    return this.certService.getTypeBadgeClass(type);
  }

  typeIcon(type: CertificateType): string {
    return this.certService.getTypeIcon(type);
  }
}
