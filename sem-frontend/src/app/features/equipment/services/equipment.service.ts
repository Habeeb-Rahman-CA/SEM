import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export interface Equipment {
  id: string;
  workspaceId: string;
  name: string;
  sku: string | null;
  category: string;
  status: 'available' | 'booked' | 'maintenance' | 'retired';
  condition: 'new' | 'good' | 'fair' | 'poor';
  purchaseDate: string | null;
  cost: number | null;
  location: string | null;
  description: string | null;
  bookings?: EquipmentBooking[];
  maintenance?: EquipmentMaintenance[];
  history?: EquipmentHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentBooking {
  id: string;
  workspaceId: string;
  equipmentId: string;
  eventId: string | null;
  bookedById: string;
  startAt: string;
  endAt: string;
  status: 'pending' | 'approved' | 'active' | 'returned' | 'cancelled';
  notes: string | null;
  equipment?: Equipment;
  bookedBy?: {
    id: string;
    username: string;
  };
  event?: {
    id: string;
    title: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentMaintenance {
  id: string;
  workspaceId: string;
  equipmentId: string;
  title: string;
  description: string | null;
  maintenanceType: 'routine' | 'repair' | 'inspection';
  scheduledDate: string;
  completedDate: string | null;
  cost: number | null;
  performedBy: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  equipment?: Equipment;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentHistory {
  id: string;
  workspaceId: string;
  equipmentId: string;
  action: string;
  performedById: string;
  notes: string | null;
  performedBy?: {
    id: string;
    username: string;
  };
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class EquipmentService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // Inventory
  getEquipment(workspaceId: string): Observable<Equipment[]> {
    return this.http.get<Equipment[]>(`${this.apiUrl}/${workspaceId}/equipment`, {
      headers: this.headers,
    });
  }

  getEquipmentBySku(workspaceId: string, sku: string): Observable<Equipment> {
    return this.http.get<Equipment>(`${this.apiUrl}/${workspaceId}/equipment/scan/${sku}`, {
      headers: this.headers,
    });
  }

  getEquipmentById(workspaceId: string, id: string): Observable<Equipment> {
    return this.http.get<Equipment>(`${this.apiUrl}/${workspaceId}/equipment/${id}`, {
      headers: this.headers,
    });
  }

  createEquipment(workspaceId: string, payload: Partial<Equipment>): Observable<Equipment> {
    return this.http.post<Equipment>(`${this.apiUrl}/${workspaceId}/equipment`, payload, {
      headers: this.headers,
    });
  }

  updateEquipment(
    workspaceId: string,
    id: string,
    payload: Partial<Equipment>,
  ): Observable<Equipment> {
    return this.http.patch<Equipment>(`${this.apiUrl}/${workspaceId}/equipment/${id}`, payload, {
      headers: this.headers,
    });
  }

  removeEquipment(workspaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/equipment/${id}`, {
      headers: this.headers,
    });
  }

  // Bookings
  getBookings(workspaceId: string): Observable<EquipmentBooking[]> {
    return this.http.get<EquipmentBooking[]>(`${this.apiUrl}/${workspaceId}/equipment-bookings`, {
      headers: this.headers,
    });
  }

  createBooking(workspaceId: string, payload: any): Observable<EquipmentBooking> {
    return this.http.post<EquipmentBooking>(
      `${this.apiUrl}/${workspaceId}/equipment-bookings`,
      payload,
      {
        headers: this.headers,
      },
    );
  }

  updateBooking(
    workspaceId: string,
    bookingId: string,
    payload: any,
  ): Observable<EquipmentBooking> {
    return this.http.patch<EquipmentBooking>(
      `${this.apiUrl}/${workspaceId}/equipment-bookings/${bookingId}`,
      payload,
      {
        headers: this.headers,
      },
    );
  }

  // Maintenance
  getMaintenanceSchedules(workspaceId: string): Observable<EquipmentMaintenance[]> {
    return this.http.get<EquipmentMaintenance[]>(
      `${this.apiUrl}/${workspaceId}/equipment-maintenance`,
      {
        headers: this.headers,
      },
    );
  }

  createMaintenance(workspaceId: string, payload: any): Observable<EquipmentMaintenance> {
    return this.http.post<EquipmentMaintenance>(
      `${this.apiUrl}/${workspaceId}/equipment-maintenance`,
      payload,
      {
        headers: this.headers,
      },
    );
  }

  updateMaintenance(
    workspaceId: string,
    maintenanceId: string,
    payload: any,
  ): Observable<EquipmentMaintenance> {
    return this.http.patch<EquipmentMaintenance>(
      `${this.apiUrl}/${workspaceId}/equipment-maintenance/${maintenanceId}`,
      payload,
      {
        headers: this.headers,
      },
    );
  }
}
