import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export interface Volunteer {
  id: string;
  workspaceId: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  skills: string[];
  notes: string | null;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VolunteerShift {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  role: string;
  startAt: string;
  endAt: string;
  maxVolunteers: number;
  assignments: Array<{
    id: string;
    shiftId: string;
    volunteerId: string;
    status: 'assigned' | 'attended' | 'absent' | 'cancelled';
    serviceHours: number;
    feedback: string | null;
    rating: number | null;
    volunteer: {
      id: string;
      user: {
        id: string;
        username: string;
      };
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface VolunteerProfile {
  volunteer: Volunteer & {
    assignments: Array<{
      id: string;
      shiftId: string;
      volunteerId: string;
      status: 'assigned' | 'attended' | 'absent' | 'cancelled';
      serviceHours: number;
      feedback: string | null;
      rating: number | null;
      shift: VolunteerShift;
    }>;
  };
  stats: {
    totalShifts: number;
    completedShifts: number;
    serviceHours: number;
  };
}

@Injectable({ providedIn: 'root' })
export class VolunteerService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getVolunteers(workspaceId: string): Observable<Volunteer[]> {
    return this.http.get<Volunteer[]>(`${this.apiUrl}/${workspaceId}/volunteers`, {
      headers: this.headers,
    });
  }

  updateVolunteer(
    workspaceId: string,
    volunteerId: string,
    payload: {
      status?: 'pending' | 'approved' | 'rejected';
      skills?: string[];
      notes?: string;
    },
  ): Observable<Volunteer> {
    return this.http.patch<Volunteer>(
      `${this.apiUrl}/${workspaceId}/volunteers/${volunteerId}`,
      payload,
      { headers: this.headers },
    );
  }

  deleteVolunteer(workspaceId: string, volunteerId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/volunteers/${volunteerId}`, {
      headers: this.headers,
    });
  }

  registerVolunteer(
    workspaceId: string,
    payload: { skills?: string[]; notes?: string },
  ): Observable<Volunteer> {
    return this.http.post<Volunteer>(`${this.apiUrl}/${workspaceId}/volunteers/register`, payload, {
      headers: this.headers,
    });
  }

  getVolunteerProfile(workspaceId: string): Observable<VolunteerProfile | null> {
    return this.http.get<VolunteerProfile | null>(
      `${this.apiUrl}/${workspaceId}/volunteers/profile`,
      { headers: this.headers },
    );
  }

  getShifts(workspaceId: string): Observable<VolunteerShift[]> {
    return this.http.get<VolunteerShift[]>(`${this.apiUrl}/${workspaceId}/volunteers/shifts`, {
      headers: this.headers,
    });
  }

  createShift(
    workspaceId: string,
    payload: {
      title: string;
      description?: string;
      role: string;
      startAt: string;
      endAt: string;
      maxVolunteers?: number;
    },
  ): Observable<VolunteerShift> {
    return this.http.post<VolunteerShift>(
      `${this.apiUrl}/${workspaceId}/volunteers/shifts`,
      payload,
      { headers: this.headers },
    );
  }

  updateShift(
    workspaceId: string,
    shiftId: string,
    payload: {
      title?: string;
      description?: string;
      role?: string;
      startAt?: string;
      endAt?: string;
      maxVolunteers?: number;
    },
  ): Observable<VolunteerShift> {
    return this.http.patch<VolunteerShift>(
      `${this.apiUrl}/${workspaceId}/volunteers/shifts/${shiftId}`,
      payload,
      { headers: this.headers },
    );
  }

  deleteShift(workspaceId: string, shiftId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/volunteers/shifts/${shiftId}`, {
      headers: this.headers,
    });
  }

  signupForShift(workspaceId: string, shiftId: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/${workspaceId}/volunteers/shifts/${shiftId}/signup`,
      {},
      { headers: this.headers },
    );
  }

  cancelShiftSignup(workspaceId: string, shiftId: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/${workspaceId}/volunteers/shifts/${shiftId}/cancel`,
      {},
      { headers: this.headers },
    );
  }

  updateAssignment(
    workspaceId: string,
    assignmentId: string,
    payload: {
      status?: 'assigned' | 'attended' | 'absent' | 'cancelled';
      serviceHours?: number;
      feedback?: string;
      rating?: number;
    },
  ): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/${workspaceId}/volunteers/assignments/${assignmentId}`,
      payload,
      { headers: this.headers },
    );
  }
}
