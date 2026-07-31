import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type FitnessLevel = 'fit' | 'limited' | 'unfit' | 'injured';
export type InjurySeverity = 'minor' | 'moderate' | 'severe' | 'critical';
export type InjuryStatus = 'active' | 'recovering' | 'recovered' | 'chronic';
export type RecoveryStatus = 'in_progress' | 'on_track' | 'delayed' | 'completed' | 'cancelled';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertSource =
  'injury' | 'fitness' | 'checkup_due' | 'clearance' | 'allergy' | 'general';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';

export interface RecoveryMilestone {
  id: string;
  title: string;
  targetDate?: string | null;
  completedAt?: string | null;
  notes?: string | null;
}

export interface MedicalProfile {
  id: string;
  workspaceId: string;
  playerId: string;
  bloodGroup: string | null;
  heightCm: number | null;
  weightKg: number | null;
  allergies: string[] | null;
  chronicConditions: string[] | null;
  medications: string[] | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  physicianName: string | null;
  physicianPhone: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  lastCheckupDate: string | null;
  nextCheckupDate: string | null;
  fitnessLevel: FitnessLevel;
  clearedToPlay: boolean;
  notes: string | null;
  player?: {
    id: string;
    userId: string;
    jerseyNumber: string | null;
    position: string | null;
    user: { id: string; username: string };
    team: { id: string; name: string };
  };
  injuries?: MedicalInjury[];
  fitnessHistory?: FitnessStatus[];
  alerts?: MedicalAlert[];
  createdAt: string;
  updatedAt: string;
}

export interface MedicalInjury {
  id: string;
  workspaceId: string;
  profileId: string;
  title: string;
  description: string | null;
  bodyPart: string | null;
  severity: InjurySeverity;
  status: InjuryStatus;
  sustainedDate: string;
  diagnosisDate: string | null;
  diagnosis: string | null;
  treatment: string | null;
  notes: string | null;
  reportedBy: string | null;
  recoveryPlan?: RecoveryPlan | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryPlan {
  id: string;
  workspaceId: string;
  injuryId: string;
  title: string;
  protocol: string | null;
  startDate: string;
  expectedReturnDate: string | null;
  actualReturnDate: string | null;
  milestones: RecoveryMilestone[] | null;
  status: RecoveryStatus;
  progressPercent: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FitnessStatus {
  id: string;
  workspaceId: string;
  profileId: string;
  assessedAt: string;
  assessedById: string | null;
  fitnessLevel: FitnessLevel;
  cardioScore: number | null;
  strengthScore: number | null;
  flexibilityScore: number | null;
  enduranceScore: number | null;
  restingHeartRate: number | null;
  bodyFatPercent: number | null;
  clearedToPlay: boolean;
  restrictions: string | null;
  notes: string | null;
  assessedBy?: { id: string; username: string } | null;
  createdAt: string;
}

export interface MedicalAlert {
  id: string;
  workspaceId: string;
  profileId: string;
  severity: AlertSeverity;
  source: AlertSource;
  title: string;
  message: string;
  status: AlertStatus;
  acknowledgedById: string | null;
  acknowledgedAt: string | null;
  expiresAt: string | null;
  sourceRefId: string | null;
  acknowledgedBy?: { id: string; username: string } | null;
  profile?: MedicalProfile;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalSummary {
  totalProfiles: number;
  injuredProfiles: number;
  unfitProfiles: number;
  notCleared: number;
  activeInjuries: number;
  openAlerts: number;
  criticalAlerts: number;
  upcomingCheckups: number;
  generatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class MedicalService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // Summary
  getSummary(workspaceId: string): Observable<MedicalSummary> {
    return this.http.get<MedicalSummary>(`${this.apiUrl}/${workspaceId}/medical/summary`, {
      headers: this.headers,
    });
  }

  // Profiles
  getProfiles(workspaceId: string): Observable<MedicalProfile[]> {
    return this.http.get<MedicalProfile[]>(`${this.apiUrl}/${workspaceId}/medical/profiles`, {
      headers: this.headers,
    });
  }

  getProfileById(workspaceId: string, id: string): Observable<MedicalProfile> {
    return this.http.get<MedicalProfile>(`${this.apiUrl}/${workspaceId}/medical/profiles/${id}`, {
      headers: this.headers,
    });
  }

  createProfile(
    workspaceId: string,
    payload: Partial<MedicalProfile> & { playerId: string },
  ): Observable<MedicalProfile> {
    return this.http.post<MedicalProfile>(
      `${this.apiUrl}/${workspaceId}/medical/profiles`,
      payload,
      { headers: this.headers },
    );
  }

  updateProfile(
    workspaceId: string,
    id: string,
    payload: Partial<MedicalProfile>,
  ): Observable<MedicalProfile> {
    return this.http.patch<MedicalProfile>(
      `${this.apiUrl}/${workspaceId}/medical/profiles/${id}`,
      payload,
      { headers: this.headers },
    );
  }

  deleteProfile(workspaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/medical/profiles/${id}`, {
      headers: this.headers,
    });
  }

  // Injuries
  createInjury(
    workspaceId: string,
    payload: Partial<MedicalInjury> & { profileId: string },
  ): Observable<MedicalInjury> {
    return this.http.post<MedicalInjury>(
      `${this.apiUrl}/${workspaceId}/medical/injuries`,
      payload,
      { headers: this.headers },
    );
  }

  updateInjury(
    workspaceId: string,
    injuryId: string,
    payload: Partial<MedicalInjury>,
  ): Observable<MedicalInjury> {
    return this.http.patch<MedicalInjury>(
      `${this.apiUrl}/${workspaceId}/medical/injuries/${injuryId}`,
      payload,
      { headers: this.headers },
    );
  }

  deleteInjury(workspaceId: string, injuryId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/medical/injuries/${injuryId}`, {
      headers: this.headers,
    });
  }

  // Recovery
  createRecoveryPlan(
    workspaceId: string,
    payload: Partial<RecoveryPlan> & { injuryId: string },
  ): Observable<RecoveryPlan> {
    return this.http.post<RecoveryPlan>(
      `${this.apiUrl}/${workspaceId}/medical/recovery-plans`,
      payload,
      { headers: this.headers },
    );
  }

  updateRecoveryPlan(
    workspaceId: string,
    planId: string,
    payload: Partial<RecoveryPlan>,
  ): Observable<RecoveryPlan> {
    return this.http.patch<RecoveryPlan>(
      `${this.apiUrl}/${workspaceId}/medical/recovery-plans/${planId}`,
      payload,
      { headers: this.headers },
    );
  }

  // Fitness
  createFitnessStatus(
    workspaceId: string,
    payload: Partial<FitnessStatus> & { profileId: string },
  ): Observable<FitnessStatus> {
    return this.http.post<FitnessStatus>(
      `${this.apiUrl}/${workspaceId}/medical/fitness-assessments`,
      payload,
      { headers: this.headers },
    );
  }

  // Alerts
  getAlerts(workspaceId: string, openOnly = false): Observable<MedicalAlert[]> {
    return this.http.get<MedicalAlert[]>(
      `${this.apiUrl}/${workspaceId}/medical/alerts${openOnly ? '?openOnly=true' : ''}`,
      { headers: this.headers },
    );
  }

  createAlert(
    workspaceId: string,
    payload: Partial<MedicalAlert> & {
      profileId: string;
      title: string;
      message: string;
    },
  ): Observable<MedicalAlert> {
    return this.http.post<MedicalAlert>(`${this.apiUrl}/${workspaceId}/medical/alerts`, payload, {
      headers: this.headers,
    });
  }

  updateAlertStatus(
    workspaceId: string,
    alertId: string,
    status: AlertStatus,
  ): Observable<MedicalAlert> {
    return this.http.patch<MedicalAlert>(
      `${this.apiUrl}/${workspaceId}/medical/alerts/${alertId}`,
      { status },
      { headers: this.headers },
    );
  }
}
