import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AlertSeverity,
  AlertStatus,
  FitnessLevel,
  InjurySeverity,
  InjuryStatus,
  MedicalAlert,
  MedicalInjury,
  MedicalProfile,
  MedicalService,
  MedicalSummary,
  RecoveryPlan,
} from '../services/medical.service';
import { PlayerService } from '../../players/services/player.service';
import { Player } from '../../workspaces/services/workspace.service';

type MedicalTab = 'overview' | 'profiles' | 'injuries' | 'alerts';

@Component({
  selector: 'app-medical',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './medical.html',
})
export class MedicalComponent implements OnInit {
  workspaceId = input.required<string>();

  private medicalService = inject(MedicalService);
  private playerService = inject(PlayerService);

  // Data state
  summary = signal<MedicalSummary | null>(null);
  profiles = signal<MedicalProfile[]>([]);
  alerts = signal<MedicalAlert[]>([]);
  players = signal<Player[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // View state
  currentTab = signal<MedicalTab>('overview');
  searchQuery = signal('');
  alertFilter = signal<'all' | 'open'>('open');
  selectedProfileId = signal<string | null>(null);

  // Modals
  isProfileModalOpen = signal(false);
  isInjuryModalOpen = signal(false);
  isRecoveryModalOpen = signal(false);
  isFitnessModalOpen = signal(false);
  isAlertModalOpen = signal(false);

  // Profile form
  editingProfileId = signal<string | null>(null);
  profileForm = signal({
    playerId: '',
    bloodGroup: '',
    heightCm: null as number | null,
    weightKg: null as number | null,
    allergiesInput: '',
    chronicConditionsInput: '',
    medicationsInput: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    physicianName: '',
    physicianPhone: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    lastCheckupDate: '',
    nextCheckupDate: '',
    fitnessLevel: 'fit' as FitnessLevel,
    clearedToPlay: true,
    notes: '',
  });

  // Injury form
  editingInjuryId = signal<string | null>(null);
  injuryProfileId = signal<string | null>(null);
  injuryForm = signal({
    title: '',
    description: '',
    bodyPart: '',
    severity: 'minor' as InjurySeverity,
    status: 'active' as InjuryStatus,
    sustainedDate: '',
    diagnosisDate: '',
    diagnosis: '',
    treatment: '',
    notes: '',
  });

  // Recovery form
  recoveryInjuryId = signal<string | null>(null);
  editingRecoveryId = signal<string | null>(null);
  recoveryForm = signal({
    title: '',
    protocol: '',
    startDate: '',
    expectedReturnDate: '',
    progressPercent: 0,
    status: 'in_progress' as RecoveryPlan['status'],
    notes: '',
  });

  // Fitness form
  fitnessProfileId = signal<string | null>(null);
  fitnessForm = signal({
    assessedAt: '',
    fitnessLevel: 'fit' as FitnessLevel,
    cardioScore: null as number | null,
    strengthScore: null as number | null,
    flexibilityScore: null as number | null,
    enduranceScore: null as number | null,
    restingHeartRate: null as number | null,
    bodyFatPercent: null as number | null,
    clearedToPlay: true,
    restrictions: '',
    notes: '',
  });

  // Alert form
  alertProfileId = signal<string | null>(null);
  alertForm = signal({
    severity: 'info' as AlertSeverity,
    title: '',
    message: '',
    expiresAt: '',
  });

  // Computed
  filteredProfiles = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.profiles();
    if (!q) return list;
    return list.filter((p) => {
      const name = p.player?.user?.username?.toLowerCase() || '';
      const team = p.player?.team?.name?.toLowerCase() || '';
      const conds = (p.chronicConditions || []).join(',').toLowerCase();
      return name.includes(q) || team.includes(q) || conds.includes(q);
    });
  });

  filteredAlerts = computed(() => {
    const list = this.alerts();
    if (this.alertFilter() === 'open') {
      return list.filter((a) => a.status === 'open');
    }
    return list;
  });

  selectedProfile = computed<MedicalProfile | null>(() => {
    const id = this.selectedProfileId();
    if (!id) return null;
    return this.profiles().find((p) => p.id === id) || null;
  });

  playersWithoutProfile = computed(() => {
    const covered = new Set(this.profiles().map((p) => p.playerId));
    return this.players().filter((p) => !covered.has(p.id));
  });

  constructor() {
    effect(
      () => {
        const wsId = this.workspaceId();
        if (wsId) this.loadAll();
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    const wsId = this.workspaceId();
    if (!wsId) return;
    this.isLoading.set(true);
    this.error.set(null);

    this.medicalService.getSummary(wsId).subscribe({
      next: (s) => this.summary.set(s),
      error: (err) => console.error('Failed to load medical summary', err),
    });

    this.medicalService.getProfiles(wsId).subscribe({
      next: (list) => this.profiles.set(list),
      error: (err) => {
        console.error('Failed to load medical profiles', err);
        this.error.set(err?.error?.message || 'Failed to load medical records');
      },
    });

    this.medicalService.getAlerts(wsId, false).subscribe({
      next: (list) => this.alerts.set(list),
      error: (err) => console.error('Failed to load alerts', err),
    });

    this.playerService.getPlayers(wsId).subscribe({
      next: (list) => {
        this.players.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load players', err);
        this.isLoading.set(false);
      },
    });
  }

  refreshProfile(profileId: string) {
    this.medicalService.getProfileById(this.workspaceId(), profileId).subscribe({
      next: (profile) => {
        const list = this.profiles().map((p) => (p.id === profile.id ? profile : p));
        this.profiles.set(list);
      },
    });
  }

  // ─── Profile Modal ─────────────────────────────────────────────────────

  openProfileModal(profile?: MedicalProfile) {
    if (profile) {
      this.editingProfileId.set(profile.id);
      this.profileForm.set({
        playerId: profile.playerId,
        bloodGroup: profile.bloodGroup || '',
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        allergiesInput: (profile.allergies || []).join(', '),
        chronicConditionsInput: (profile.chronicConditions || []).join(', '),
        medicationsInput: (profile.medications || []).join(', '),
        emergencyContactName: profile.emergencyContactName || '',
        emergencyContactPhone: profile.emergencyContactPhone || '',
        emergencyContactRelation: profile.emergencyContactRelation || '',
        physicianName: profile.physicianName || '',
        physicianPhone: profile.physicianPhone || '',
        insuranceProvider: profile.insuranceProvider || '',
        insurancePolicyNumber: profile.insurancePolicyNumber || '',
        lastCheckupDate: profile.lastCheckupDate?.slice(0, 10) || '',
        nextCheckupDate: profile.nextCheckupDate?.slice(0, 10) || '',
        fitnessLevel: profile.fitnessLevel,
        clearedToPlay: profile.clearedToPlay,
        notes: profile.notes || '',
      });
    } else {
      this.editingProfileId.set(null);
      this.profileForm.set({
        playerId: '',
        bloodGroup: '',
        heightCm: null,
        weightKg: null,
        allergiesInput: '',
        chronicConditionsInput: '',
        medicationsInput: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelation: '',
        physicianName: '',
        physicianPhone: '',
        insuranceProvider: '',
        insurancePolicyNumber: '',
        lastCheckupDate: '',
        nextCheckupDate: '',
        fitnessLevel: 'fit',
        clearedToPlay: true,
        notes: '',
      });
    }
    this.isProfileModalOpen.set(true);
  }

  closeProfileModal() {
    this.isProfileModalOpen.set(false);
  }

  saveProfile() {
    const form = this.profileForm();
    const parseList = (s: string) =>
      s
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

    const payload: any = {
      bloodGroup: form.bloodGroup || null,
      heightCm: form.heightCm,
      weightKg: form.weightKg,
      allergies: parseList(form.allergiesInput),
      chronicConditions: parseList(form.chronicConditionsInput),
      medications: parseList(form.medicationsInput),
      emergencyContactName: form.emergencyContactName || null,
      emergencyContactPhone: form.emergencyContactPhone || null,
      emergencyContactRelation: form.emergencyContactRelation || null,
      physicianName: form.physicianName || null,
      physicianPhone: form.physicianPhone || null,
      insuranceProvider: form.insuranceProvider || null,
      insurancePolicyNumber: form.insurancePolicyNumber || null,
      lastCheckupDate: form.lastCheckupDate || null,
      nextCheckupDate: form.nextCheckupDate || null,
      fitnessLevel: form.fitnessLevel,
      clearedToPlay: form.clearedToPlay,
      notes: form.notes || null,
    };

    const wsId = this.workspaceId();
    const editingId = this.editingProfileId();

    const req = editingId
      ? this.medicalService.updateProfile(wsId, editingId, payload)
      : this.medicalService.createProfile(wsId, {
          ...payload,
          playerId: form.playerId,
        });

    req.subscribe({
      next: () => {
        this.closeProfileModal();
        this.loadAll();
      },
      error: (err) => alert(err?.error?.message || 'Failed to save profile'),
    });
  }

  deleteProfile(profile: MedicalProfile) {
    if (
      !confirm(
        `Permanently delete medical records for ${profile.player?.user?.username || 'this player'}? This cannot be undone.`,
      )
    )
      return;
    this.medicalService.deleteProfile(this.workspaceId(), profile.id).subscribe({
      next: () => this.loadAll(),
      error: (err) => alert(err?.error?.message || 'Failed to delete profile'),
    });
  }

  // ─── Injury Modal ──────────────────────────────────────────────────────

  openInjuryModal(profileId: string, injury?: MedicalInjury) {
    this.injuryProfileId.set(profileId);
    if (injury) {
      this.editingInjuryId.set(injury.id);
      this.injuryForm.set({
        title: injury.title,
        description: injury.description || '',
        bodyPart: injury.bodyPart || '',
        severity: injury.severity,
        status: injury.status,
        sustainedDate: injury.sustainedDate?.slice(0, 10) || '',
        diagnosisDate: injury.diagnosisDate?.slice(0, 10) || '',
        diagnosis: injury.diagnosis || '',
        treatment: injury.treatment || '',
        notes: injury.notes || '',
      });
    } else {
      this.editingInjuryId.set(null);
      this.injuryForm.set({
        title: '',
        description: '',
        bodyPart: '',
        severity: 'minor',
        status: 'active',
        sustainedDate: new Date().toISOString().slice(0, 10),
        diagnosisDate: '',
        diagnosis: '',
        treatment: '',
        notes: '',
      });
    }
    this.isInjuryModalOpen.set(true);
  }

  closeInjuryModal() {
    this.isInjuryModalOpen.set(false);
  }

  saveInjury() {
    const form = this.injuryForm();
    const profileId = this.injuryProfileId();
    if (!profileId) return;

    const payload: any = {
      title: form.title,
      description: form.description || null,
      bodyPart: form.bodyPart || null,
      severity: form.severity,
      status: form.status,
      sustainedDate: form.sustainedDate,
      diagnosisDate: form.diagnosisDate || null,
      diagnosis: form.diagnosis || null,
      treatment: form.treatment || null,
      notes: form.notes || null,
    };

    const wsId = this.workspaceId();
    const id = this.editingInjuryId();

    const req = id
      ? this.medicalService.updateInjury(wsId, id, payload)
      : this.medicalService.createInjury(wsId, { ...payload, profileId });

    req.subscribe({
      next: () => {
        this.closeInjuryModal();
        this.refreshProfile(profileId);
        this.medicalService.getAlerts(wsId, false).subscribe({
          next: (list) => this.alerts.set(list),
        });
        this.medicalService.getSummary(wsId).subscribe({
          next: (s) => this.summary.set(s),
        });
      },
      error: (err) => alert(err?.error?.message || 'Failed to save injury'),
    });
  }

  deleteInjury(profileId: string, injuryId: string) {
    if (!confirm('Delete this injury record?')) return;
    this.medicalService.deleteInjury(this.workspaceId(), injuryId).subscribe({
      next: () => this.refreshProfile(profileId),
      error: (err) => alert(err?.error?.message || 'Failed to delete injury'),
    });
  }

  // ─── Recovery Plan Modal ───────────────────────────────────────────────

  openRecoveryModal(injury: MedicalInjury) {
    this.recoveryInjuryId.set(injury.id);
    if (injury.recoveryPlan) {
      this.editingRecoveryId.set(injury.recoveryPlan.id);
      this.recoveryForm.set({
        title: injury.recoveryPlan.title,
        protocol: injury.recoveryPlan.protocol || '',
        startDate: injury.recoveryPlan.startDate?.slice(0, 10) || '',
        expectedReturnDate: injury.recoveryPlan.expectedReturnDate?.slice(0, 10) || '',
        progressPercent: injury.recoveryPlan.progressPercent,
        status: injury.recoveryPlan.status,
        notes: injury.recoveryPlan.notes || '',
      });
    } else {
      this.editingRecoveryId.set(null);
      this.recoveryForm.set({
        title: `Recovery for ${injury.title}`,
        protocol: '',
        startDate: new Date().toISOString().slice(0, 10),
        expectedReturnDate: '',
        progressPercent: 0,
        status: 'in_progress',
        notes: '',
      });
    }
    this.isRecoveryModalOpen.set(true);
  }

  closeRecoveryModal() {
    this.isRecoveryModalOpen.set(false);
  }

  saveRecoveryPlan() {
    const form = this.recoveryForm();
    const injuryId = this.recoveryInjuryId();
    if (!injuryId) return;

    const payload: any = {
      title: form.title,
      protocol: form.protocol || null,
      startDate: form.startDate,
      expectedReturnDate: form.expectedReturnDate || null,
      progressPercent: form.progressPercent,
      status: form.status,
      notes: form.notes || null,
    };

    const wsId = this.workspaceId();
    const id = this.editingRecoveryId();
    const profileId = this.selectedProfileId();

    const req = id
      ? this.medicalService.updateRecoveryPlan(wsId, id, payload)
      : this.medicalService.createRecoveryPlan(wsId, { ...payload, injuryId });

    req.subscribe({
      next: () => {
        this.closeRecoveryModal();
        if (profileId) this.refreshProfile(profileId);
      },
      error: (err) => alert(err?.error?.message || 'Failed to save recovery plan'),
    });
  }

  // ─── Fitness Modal ─────────────────────────────────────────────────────

  openFitnessModal(profileId: string) {
    this.fitnessProfileId.set(profileId);
    this.fitnessForm.set({
      assessedAt: new Date().toISOString().slice(0, 10),
      fitnessLevel: 'fit',
      cardioScore: null,
      strengthScore: null,
      flexibilityScore: null,
      enduranceScore: null,
      restingHeartRate: null,
      bodyFatPercent: null,
      clearedToPlay: true,
      restrictions: '',
      notes: '',
    });
    this.isFitnessModalOpen.set(true);
  }

  closeFitnessModal() {
    this.isFitnessModalOpen.set(false);
  }

  saveFitness() {
    const form = this.fitnessForm();
    const profileId = this.fitnessProfileId();
    if (!profileId) return;

    const payload: any = {
      profileId,
      assessedAt: form.assessedAt,
      fitnessLevel: form.fitnessLevel,
      cardioScore: form.cardioScore,
      strengthScore: form.strengthScore,
      flexibilityScore: form.flexibilityScore,
      enduranceScore: form.enduranceScore,
      restingHeartRate: form.restingHeartRate,
      bodyFatPercent: form.bodyFatPercent,
      clearedToPlay: form.clearedToPlay,
      restrictions: form.restrictions || null,
      notes: form.notes || null,
    };

    this.medicalService.createFitnessStatus(this.workspaceId(), payload).subscribe({
      next: () => {
        this.closeFitnessModal();
        this.loadAll();
      },
      error: (err) => alert(err?.error?.message || 'Failed to save fitness assessment'),
    });
  }

  // ─── Alert Modal ───────────────────────────────────────────────────────

  openAlertModal(profileId: string) {
    this.alertProfileId.set(profileId);
    this.alertForm.set({
      severity: 'info',
      title: '',
      message: '',
      expiresAt: '',
    });
    this.isAlertModalOpen.set(true);
  }

  closeAlertModal() {
    this.isAlertModalOpen.set(false);
  }

  saveAlert() {
    const form = this.alertForm();
    const profileId = this.alertProfileId();
    if (!profileId) return;

    this.medicalService
      .createAlert(this.workspaceId(), {
        profileId,
        severity: form.severity,
        source: 'general',
        title: form.title,
        message: form.message,
        expiresAt: form.expiresAt || null,
      })
      .subscribe({
        next: () => {
          this.closeAlertModal();
          this.loadAll();
        },
        error: (err) => alert(err?.error?.message || 'Failed to raise alert'),
      });
  }

  changeAlertStatus(entry: MedicalAlert, status: AlertStatus) {
    this.medicalService.updateAlertStatus(this.workspaceId(), entry.id, status).subscribe({
      next: () => this.loadAll(),
      error: (err) => alert(err?.error?.message || 'Failed to update alert status'),
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  fitnessBadgeClass(level: FitnessLevel): string {
    switch (level) {
      case 'fit':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'limited':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'unfit':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      case 'injured':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
    }
  }

  severityBadgeClass(severity: InjurySeverity): string {
    switch (severity) {
      case 'minor':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'moderate':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'severe':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      case 'critical':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
    }
  }

  alertSeverityBadgeClass(severity: AlertSeverity): string {
    switch (severity) {
      case 'info':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'warning':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'critical':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
    }
  }

  injuryStatusBadgeClass(status: InjuryStatus): string {
    switch (status) {
      case 'active':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'recovering':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'recovered':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'chronic':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    }
  }

  bmi(profile: MedicalProfile): number | null {
    if (!profile.heightCm || !profile.weightKg) return null;
    const m = profile.heightCm / 100;
    return Math.round((profile.weightKg / (m * m)) * 10) / 10;
  }

  selectProfile(profileId: string) {
    this.selectedProfileId.set(profileId);
    this.medicalService.getProfileById(this.workspaceId(), profileId).subscribe({
      next: (profile) => {
        const list = this.profiles().map((p) => (p.id === profile.id ? profile : p));
        this.profiles.set(list);
      },
    });
  }
}
