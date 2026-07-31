import { Component, OnInit, input, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  VolunteerService,
  Volunteer,
  VolunteerShift,
  VolunteerProfile,
} from '../services/volunteer.service';
import { AuthService } from '../../auth/services/auth.service';
import { WorkspaceMember } from '../../workspaces/services/workspace.service';

@Component({
  selector: 'app-volunteers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './volunteers.html',
})
export class VolunteersComponent implements OnInit {
  workspaceId = input.required<string>();
  members = input<WorkspaceMember[]>([]);

  private volunteerService = inject(VolunteerService);
  private authService = inject(AuthService);

  // States
  myProfile = signal<VolunteerProfile | null>(null);
  volunteers = signal<Volunteer[]>([]);
  shifts = signal<VolunteerShift[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Authorization / Mode
  isManager = computed(() => {
    const userId = this.authService.currentUser()?.id;
    const member = this.members().find((m) => m.userId === userId);
    if (!member || !member.role) return false;
    if (member.role.slug === 'owner' || member.role.slug === 'administrator') return true;
    return member.role.permissions?.some((p) => p.slug === 'volunteer.manage') ?? false;
  });

  viewMode = signal<'volunteer' | 'manager'>('volunteer');

  // Application Modal state
  isRegisterModalOpen = signal(false);
  skillsInput = signal<string>('');
  notesInput = signal<string>('');

  // Shift Modal State
  isShiftModalOpen = signal(false);
  editingShiftId = signal<string | null>(null);
  newShiftTitle = signal<string>('');
  newShiftDescription = signal<string>('');
  newShiftRole = signal<string>('');
  newShiftStartAt = signal<string>('');
  newShiftEndAt = signal<string>('');
  newShiftMaxVolunteers = signal<number>(5);

  // Assignment Completion Modal State
  isAssignmentModalOpen = signal(false);
  selectedAssignmentId = signal<string | null>(null);
  assignmentStatus = signal<'assigned' | 'attended' | 'absent' | 'cancelled'>('attended');
  assignmentHours = signal<number>(0);
  assignmentFeedback = signal<string>('');
  assignmentRating = signal<number>(5);

  constructor() {
    effect(
      () => {
        // Toggle default view mode when isManager changes
        if (this.isManager()) {
          this.viewMode.set('manager');
        } else {
          this.viewMode.set('volunteer');
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        const wsId = this.workspaceId();
        if (wsId) {
          this.loadAll();
        }
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.isLoading.set(true);
    this.error.set(null);
    const wsId = this.workspaceId();

    if (this.isManager()) {
      this.volunteerService.getVolunteers(wsId).subscribe({
        next: (vols) => this.volunteers.set(vols),
        error: (err) => console.error('Failed to load volunteers list', err),
      });
    }

    this.volunteerService.getVolunteerProfile(wsId).subscribe({
      next: (profile) => this.myProfile.set(profile),
      error: (err) => console.error('Failed to load volunteer profile', err),
    });

    this.volunteerService.getShifts(wsId).subscribe({
      next: (shifts) => {
        this.shifts.set(shifts);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load volunteer details.');
        this.isLoading.set(false);
      },
    });
  }

  // ── Volunteer self-service actions ──

  openRegisterModal() {
    this.skillsInput.set('');
    this.notesInput.set('');
    this.isRegisterModalOpen.set(true);
  }

  closeRegisterModal() {
    this.isRegisterModalOpen.set(false);
  }

  registerAsVolunteer() {
    const skills = this.skillsInput()
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    this.volunteerService
      .registerVolunteer(this.workspaceId(), {
        skills,
        notes: this.notesInput(),
      })
      .subscribe({
        next: () => {
          this.closeRegisterModal();
          this.loadAll();
        },
        error: (err) => {
          alert(err?.error?.message || 'Failed to submit application');
        },
      });
  }

  signupForShift(shiftId: string) {
    this.volunteerService.signupForShift(this.workspaceId(), shiftId).subscribe({
      next: () => this.loadAll(),
      error: (err) => alert(err?.error?.message || 'Failed to sign up for shift'),
    });
  }

  cancelShiftSignup(shiftId: string) {
    if (!confirm('Are you sure you want to cancel this shift signup?')) return;
    this.volunteerService.cancelShiftSignup(this.workspaceId(), shiftId).subscribe({
      next: () => this.loadAll(),
      error: (err) => alert(err?.error?.message || 'Failed to cancel signup'),
    });
  }

  // ── Manager/Organizer actions ──

  updateVolunteerStatus(volId: string, status: 'approved' | 'rejected') {
    this.volunteerService.updateVolunteer(this.workspaceId(), volId, { status }).subscribe({
      next: () => this.loadAll(),
      error: (err) => alert('Failed to update status'),
    });
  }

  deleteVolunteerRegistration(volId: string) {
    if (!confirm('Remove this volunteer registration permanently?')) return;
    this.volunteerService.deleteVolunteer(this.workspaceId(), volId).subscribe({
      next: () => this.loadAll(),
      error: (err) => alert('Failed to delete registration'),
    });
  }

  openShiftModal(shift?: VolunteerShift) {
    if (shift) {
      this.editingShiftId.set(shift.id);
      this.newShiftTitle.set(shift.title);
      this.newShiftDescription.set(shift.description || '');
      this.newShiftRole.set(shift.role);
      this.newShiftStartAt.set(this.formatDateForInput(shift.startAt));
      this.newShiftEndAt.set(this.formatDateForInput(shift.endAt));
      this.newShiftMaxVolunteers.set(shift.maxVolunteers);
    } else {
      this.editingShiftId.set(null);
      this.newShiftTitle.set('');
      this.newShiftDescription.set('');
      this.newShiftRole.set('');
      this.newShiftStartAt.set('');
      this.newShiftEndAt.set('');
      this.newShiftMaxVolunteers.set(5);
    }
    this.isShiftModalOpen.set(true);
  }

  closeShiftModal() {
    this.isShiftModalOpen.set(false);
  }

  saveShift() {
    const payload = {
      title: this.newShiftTitle(),
      description: this.newShiftDescription(),
      role: this.newShiftRole(),
      startAt: new Date(this.newShiftStartAt()).toISOString(),
      endAt: new Date(this.newShiftEndAt()).toISOString(),
      maxVolunteers: this.newShiftMaxVolunteers(),
    };

    const wsId = this.workspaceId();
    const id = this.editingShiftId();

    const request = id
      ? this.volunteerService.updateShift(wsId, id, payload)
      : this.volunteerService.createShift(wsId, payload);

    request.subscribe({
      next: () => {
        this.closeShiftModal();
        this.loadAll();
      },
      error: (err) => alert(err?.error?.message || 'Failed to save shift'),
    });
  }

  deleteShift(shiftId: string) {
    if (!confirm('Are you sure you want to delete this shift?')) return;
    this.volunteerService.deleteShift(this.workspaceId(), shiftId).subscribe({
      next: () => this.loadAll(),
      error: (err) => alert('Failed to delete shift'),
    });
  }

  openAssignmentModal(
    assignmentId: string,
    status: any,
    hours: number,
    feedback: string | null,
    rating: number | null,
  ) {
    this.selectedAssignmentId.set(assignmentId);
    this.assignmentStatus.set(status);
    this.assignmentHours.set(hours);
    this.assignmentFeedback.set(feedback || '');
    this.assignmentRating.set(rating || 5);
    this.isAssignmentModalOpen.set(true);
  }

  closeAssignmentModal() {
    this.isAssignmentModalOpen.set(false);
  }

  saveAssignment() {
    const id = this.selectedAssignmentId();
    if (!id) return;

    this.volunteerService
      .updateAssignment(this.workspaceId(), id, {
        status: this.assignmentStatus(),
        serviceHours: this.assignmentHours(),
        feedback: this.assignmentFeedback(),
        rating: this.assignmentRating(),
      })
      .subscribe({
        next: () => {
          this.closeAssignmentModal();
          this.loadAll();
        },
        error: (err) => alert('Failed to update assignment details'),
      });
  }

  // Helpers
  private formatDateForInput(dateString: string): string {
    const d = new Date(dateString);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  hasSignedUp(shift: VolunteerShift): boolean {
    const volunteerId = this.myProfile()?.volunteer?.id;
    if (!volunteerId) return false;
    return shift.assignments.some((a) => a.volunteerId === volunteerId && a.status !== 'cancelled');
  }

  getFilledCount(shift: VolunteerShift): number {
    return shift.assignments.filter((a) => a.status !== 'cancelled').length;
  }
}
