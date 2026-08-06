import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspacesService } from '../workspaces/workspaces.service';

export type CertificateType =
  'participation' | 'winners' | 'referee' | 'volunteer' | 'organizer';

export interface DigitalCertificate {
  id: string;
  code: string;
  workspaceId: string;
  eventId?: string;
  recipientName: string;
  recipientEmail?: string;
  certificateType: CertificateType;
  certificateTitle: string;
  eventName: string;
  position?: string;
  issueDate: string;
  qrVerificationUrl: string;
  isVerified: boolean;
  metadata: {
    signatoryName: string;
    signatoryTitle: string;
    workspaceName: string;
    achievementSummary?: string;
  };
}

@Injectable()
export class CertificatesService {
  private certificatesStore: Map<string, DigitalCertificate> = new Map();

  constructor(private readonly workspacesService: WorkspacesService) {
    this.seedSampleCertificates();
  }

  private seedSampleCertificates() {
    const samples: DigitalCertificate[] = [
      {
        id: 'cert-1',
        code: 'CERT-2026-TAISEN-WIN-98A4',
        workspaceId: 'default-ws',
        recipientName: 'Alex Rivera',
        recipientEmail: 'alex.rivera@example.com',
        certificateType: 'winners',
        certificateTitle: 'Certificate of Excellence & Championship Winner',
        eventName: 'Taisen League Championship 2025',
        position: '1st Place Champions',
        issueDate: '2026-08-01',
        qrVerificationUrl:
          '/public/certificates/verify/CERT-2026-TAISEN-WIN-98A4',
        isVerified: true,
        metadata: {
          signatoryName: 'Marcus Vance',
          signatoryTitle: 'Tournament Director',
          workspaceName: 'Taisen Sports League',
          achievementSummary:
            'Awarded for outstanding performance and winning the 2025 League Title.',
        },
      },
      {
        id: 'cert-2',
        code: 'CERT-2026-TAISEN-PAR-44B1',
        workspaceId: 'default-ws',
        recipientName: 'John Doe',
        recipientEmail: 'john.doe@example.com',
        certificateType: 'participation',
        certificateTitle: 'Certificate of Official Tournament Participation',
        eventName: 'Taisen League Championship 2025',
        position: 'Finalist Competitor',
        issueDate: '2026-08-01',
        qrVerificationUrl:
          '/public/certificates/verify/CERT-2026-TAISEN-PAR-44B1',
        isVerified: true,
        metadata: {
          signatoryName: 'Marcus Vance',
          signatoryTitle: 'Tournament Director',
          workspaceName: 'Taisen Sports League',
          achievementSummary:
            'Awarded for active participation and sportsmanship in all season matches.',
        },
      },
      {
        id: 'cert-3',
        code: 'CERT-2026-TAISEN-REF-12X8',
        workspaceId: 'default-ws',
        recipientName: 'Elena Rostova',
        recipientEmail: 'elena.rostova@example.com',
        certificateType: 'referee',
        certificateTitle: 'Certificate of Official Match Referee',
        eventName: 'Taisen League Championship 2025',
        position: 'Head Official Referee',
        issueDate: '2026-08-01',
        qrVerificationUrl:
          '/public/certificates/verify/CERT-2026-TAISEN-REF-12X8',
        isVerified: true,
        metadata: {
          signatoryName: 'Marcus Vance',
          signatoryTitle: 'Tournament Director',
          workspaceName: 'Taisen Sports League',
          achievementSummary:
            'Awarded for fair play officiating and officiating the Grand Final match.',
        },
      },
      {
        id: 'cert-4',
        code: 'CERT-2026-TAISEN-VOL-77M3',
        workspaceId: 'default-ws',
        recipientName: 'Sarah Jenkins',
        recipientEmail: 'sarah.j@example.com',
        certificateType: 'volunteer',
        certificateTitle: 'Certificate of Event Volunteer Service',
        eventName: 'Taisen League Championship 2025',
        position: 'Event Coordinator Volunteer',
        issueDate: '2026-08-01',
        qrVerificationUrl:
          '/public/certificates/verify/CERT-2026-TAISEN-VOL-77M3',
        isVerified: true,
        metadata: {
          signatoryName: 'Marcus Vance',
          signatoryTitle: 'Tournament Director',
          workspaceName: 'Taisen Sports League',
          achievementSummary:
            'Awarded for dedicated volunteer contributions and spectator support.',
        },
      },
      {
        id: 'cert-5',
        code: 'CERT-2026-TAISEN-ORG-55K9',
        workspaceId: 'default-ws',
        recipientName: 'David Sterling',
        recipientEmail: 'david.s@example.com',
        certificateType: 'organizer',
        certificateTitle: 'Certificate of Lead Event Organizing Committee',
        eventName: 'Taisen League Championship 2025',
        position: 'Operations Manager',
        issueDate: '2026-08-01',
        qrVerificationUrl:
          '/public/certificates/verify/CERT-2026-TAISEN-ORG-55K9',
        isVerified: true,
        metadata: {
          signatoryName: 'Marcus Vance',
          signatoryTitle: 'Tournament Director',
          workspaceName: 'Taisen Sports League',
          achievementSummary:
            'Awarded for leadership in organizing and managing league operations.',
        },
      },
    ];

    for (const cert of samples) {
      this.certificatesStore.set(cert.id, cert);
      this.certificatesStore.set(cert.code, cert);
    }
  }

  async listCertificates(
    workspaceId: string,
    eventId?: string,
    userId?: string,
  ): Promise<DigitalCertificate[]> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const all = Array.from(this.certificatesStore.values());
    const uniqueMap = new Map<string, DigitalCertificate>();
    for (const cert of all) {
      if (!uniqueMap.has(cert.id)) {
        uniqueMap.set(cert.id, cert);
      }
    }

    let list = Array.from(uniqueMap.values());
    if (workspaceId !== 'default-ws') {
      list = list.filter(
        (c) => c.workspaceId === workspaceId || c.workspaceId === 'default-ws',
      );
    }
    if (eventId) {
      list = list.filter((c) => c.eventId === eventId);
    }
    return list;
  }

  async generateCertificate(
    workspaceId: string,
    dto: {
      recipientName: string;
      recipientEmail?: string;
      certificateType: CertificateType;
      eventName: string;
      eventId?: string;
      position?: string;
      issueDate?: string;
      signatoryName?: string;
      signatoryTitle?: string;
    },
    userId?: string,
  ): Promise<DigitalCertificate> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const typePrefix = dto.certificateType.substring(0, 3).toUpperCase();
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `CERT-${new Date().getFullYear()}-TAISEN-${typePrefix}-${randomHex}`;
    const id = `cert-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let certificateTitle = 'Certificate of Recognition';
    let achievementSummary =
      'Awarded in recognition of official participation and contributions.';

    switch (dto.certificateType) {
      case 'winners':
        certificateTitle = 'Certificate of Excellence & Championship Winner';
        achievementSummary = `Awarded for outstanding athletic performance and winning ${dto.position || 'Championship'} honors.`;
        break;
      case 'participation':
        certificateTitle = 'Certificate of Official Tournament Participation';
        achievementSummary = `Awarded for active participation and sportsmanship in ${dto.eventName}.`;
        break;
      case 'referee':
        certificateTitle = 'Certificate of Official Match Referee';
        achievementSummary = `Awarded for fair play officiating and match control in ${dto.eventName}.`;
        break;
      case 'volunteer':
        certificateTitle = 'Certificate of Event Volunteer Service';
        achievementSummary = `Awarded for dedicated volunteer service and operational support in ${dto.eventName}.`;
        break;
      case 'organizer':
        certificateTitle = 'Certificate of Event Organizing Committee';
        achievementSummary = `Awarded for leadership, management, and execution of ${dto.eventName}.`;
        break;
    }

    const cert: DigitalCertificate = {
      id,
      code,
      workspaceId,
      eventId: dto.eventId,
      recipientName: dto.recipientName,
      recipientEmail: dto.recipientEmail,
      certificateType: dto.certificateType,
      certificateTitle,
      eventName: dto.eventName,
      position: dto.position,
      issueDate: dto.issueDate || new Date().toISOString().split('T')[0],
      qrVerificationUrl: `/public/certificates/verify/${code}`,
      isVerified: true,
      metadata: {
        signatoryName: dto.signatoryName || 'Marcus Vance',
        signatoryTitle: dto.signatoryTitle || 'Tournament Director',
        workspaceName: 'Taisen Sports League',
        achievementSummary,
      },
    };

    this.certificatesStore.set(cert.id, cert);
    this.certificatesStore.set(cert.code, cert);
    return cert;
  }

  async bulkGenerateCertificates(
    workspaceId: string,
    dto: {
      eventName: string;
      eventId?: string;
      types?: CertificateType[];
      recipients?: Array<{
        name: string;
        email?: string;
        type: CertificateType;
        position?: string;
      }>;
    },
    userId?: string,
  ): Promise<{ generatedCount: number; certificates: DigitalCertificate[] }> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const defaultRecipients: Array<{
      name: string;
      email?: string;
      type: CertificateType;
      position?: string;
    }> = dto.recipients || [
      { name: 'Liam Chen', type: 'winners', position: '1st Place Golden Boot' },
      { name: 'Sofia Rodriguez', type: 'winners', position: 'MVP Winner' },
      {
        name: 'Michael Chang',
        type: 'participation',
        position: 'Squad Player',
      },
      { name: 'Amara Okafor', type: 'referee', position: 'Assistant Referee' },
      {
        name: 'James Wilson',
        type: 'volunteer',
        position: 'Logistics Coordinator',
      },
      { name: 'Clara Oswald', type: 'organizer', position: 'Tournament Host' },
    ];

    const results: DigitalCertificate[] = [];
    for (const r of defaultRecipients) {
      const created = await this.generateCertificate(workspaceId, {
        recipientName: r.name,
        recipientEmail: r.email,
        certificateType: r.type,
        eventName: dto.eventName,
        eventId: dto.eventId,
        position: r.position,
      });
      results.push(created);
    }

    return {
      generatedCount: results.length,
      certificates: results,
    };
  }

  async verifyCertificate(code: string): Promise<DigitalCertificate> {
    const cert = this.certificatesStore.get(code);
    if (!cert) {
      throw new NotFoundException(
        `Certificate with code "${code}" not found or invalid`,
      );
    }
    return cert;
  }
}
