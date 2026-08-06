import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  CertificateService,
  DigitalCertificate,
} from '../../../certificates/services/certificate.service';

@Component({
  selector: 'app-certificate-verify',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './certificate-verify.html',
})
export class CertificateVerifyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private certService = inject(CertificateService);

  code = signal<string>('');
  certificate = signal<DigitalCertificate | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const codeParam = params.get('code') ?? '';
      this.code.set(codeParam);
      if (codeParam) {
        this.verify(codeParam);
      } else {
        this.isLoading.set(false);
        this.error.set('No certificate verification code provided');
      }
    });
  }

  verify(codeParam: string) {
    this.isLoading.set(true);
    this.error.set(null);
    this.certService.verifyPublic(codeParam).subscribe({
      next: (cert) => {
        this.certificate.set(cert);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Certificate invalid or not found');
        this.isLoading.set(false);
      },
    });
  }

  printCertificate() {
    window.print();
  }

  badgeClass(type: string): string {
    return this.certService.getTypeBadgeClass(type as any);
  }

  typeIcon(type: string): string {
    return this.certService.getTypeIcon(type as any);
  }
}
