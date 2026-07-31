import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Volunteer } from './entities/volunteer.entity';
import { VolunteerShift } from './entities/volunteer-shift.entity';
import { VolunteerAssignment } from './entities/volunteer-assignment.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateVolunteerDto } from './dto/create-volunteer.dto';
import { UpdateVolunteerDto } from './dto/update-volunteer.dto';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Injectable()
export class VolunteersService {
  constructor(
    @InjectRepository(Volunteer)
    private readonly volunteerRepo: Repository<Volunteer>,
    @InjectRepository(VolunteerShift)
    private readonly shiftRepo: Repository<VolunteerShift>,
    @InjectRepository(VolunteerAssignment)
    private readonly assignmentRepo: Repository<VolunteerAssignment>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ─── Volunteer Management (Organizers) ───────────────────────────────────

  async getVolunteers(
    workspaceId: string,
    userId: string,
  ): Promise<Volunteer[]> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'volunteer.manage',
    );
    return this.volunteerRepo.find({
      where: { workspaceId },
      relations: { user: true, assignments: { shift: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async updateVolunteer(
    workspaceId: string,
    volunteerId: string,
    dto: UpdateVolunteerDto,
    userId: string,
  ): Promise<Volunteer> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'volunteer.manage',
    );
    const volunteer = await this.volunteerRepo.findOne({
      where: { id: volunteerId, workspaceId },
      relations: { user: true },
    });
    if (!volunteer) {
      throw new NotFoundException('Volunteer registration not found');
    }

    Object.assign(volunteer, {
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.skills !== undefined && { skills: dto.skills }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    return this.volunteerRepo.save(volunteer);
  }

  async deleteVolunteer(
    workspaceId: string,
    volunteerId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'volunteer.manage',
    );
    const volunteer = await this.volunteerRepo.findOne({
      where: { id: volunteerId, workspaceId },
    });
    if (!volunteer) {
      throw new NotFoundException('Volunteer registration not found');
    }
    await this.volunteerRepo.remove(volunteer);
  }

  // ─── Volunteer Self-Service (Portal) ─────────────────────────────────────

  async registerVolunteer(
    workspaceId: string,
    dto: CreateVolunteerDto,
    requesterUserId: string,
  ): Promise<Volunteer> {
    const targetUserId = dto.userId || requesterUserId;

    // Check if user is member of the workspace (must be registered)
    await this.workspacesService.ensureMember(workspaceId, requesterUserId);

    const existing = await this.volunteerRepo.findOne({
      where: { workspaceId, userId: targetUserId },
    });
    if (existing) {
      throw new ConflictException(
        'This user is already registered as a volunteer',
      );
    }

    const volunteer = this.volunteerRepo.create({
      workspaceId,
      userId: targetUserId,
      status: 'pending',
      skills: dto.skills || [],
      notes: dto.notes || null,
    });

    const saved = await this.volunteerRepo.save(volunteer);
    return this.volunteerRepo.findOne({
      where: { id: saved.id },
      relations: { user: true },
    });
  }

  async getVolunteerProfile(
    workspaceId: string,
    requesterUserId: string,
  ): Promise<any> {
    await this.workspacesService.ensureMember(workspaceId, requesterUserId);
    const volunteer = await this.volunteerRepo.findOne({
      where: { workspaceId, userId: requesterUserId },
      relations: {
        user: true,
        assignments: {
          shift: true,
        },
      },
    });

    if (!volunteer) {
      return null;
    }

    // Calculate hours completed
    const attendedAssignments = volunteer.assignments.filter(
      (a) => a.status === 'attended',
    );
    const totalHours = attendedAssignments.reduce(
      (sum, a) => sum + Number(a.serviceHours || 0),
      0,
    );

    return {
      volunteer,
      stats: {
        totalShifts: volunteer.assignments.length,
        completedShifts: attendedAssignments.length,
        serviceHours: totalHours,
      },
    };
  }

  async signupForShift(
    workspaceId: string,
    shiftId: string,
    requesterUserId: string,
  ): Promise<VolunteerAssignment> {
    await this.workspacesService.ensureMember(workspaceId, requesterUserId);

    const volunteer = await this.volunteerRepo.findOne({
      where: { workspaceId, userId: requesterUserId },
    });
    if (!volunteer) {
      throw new ForbiddenException('You must register as a volunteer first');
    }
    if (volunteer.status !== 'approved') {
      throw new ForbiddenException(
        `Your volunteer application is currently ${volunteer.status}`,
      );
    }

    const shift = await this.shiftRepo.findOne({
      where: { id: shiftId, workspaceId },
      relations: { assignments: true },
    });
    if (!shift) {
      throw new NotFoundException('Volunteer shift not found');
    }

    const activeSignups = shift.assignments.filter(
      (a) => a.status !== 'cancelled',
    );
    if (activeSignups.length >= shift.maxVolunteers) {
      throw new ConflictException('This shift is already full');
    }

    const existingAssignment = await this.assignmentRepo.findOne({
      where: { shiftId, volunteerId: volunteer.id },
    });
    if (existingAssignment) {
      if (existingAssignment.status === 'cancelled') {
        existingAssignment.status = 'assigned';
        return this.assignmentRepo.save(existingAssignment);
      }
      throw new ConflictException('You are already registered for this shift');
    }

    const assignment = this.assignmentRepo.create({
      shiftId,
      volunteerId: volunteer.id,
      status: 'assigned',
      serviceHours: 0,
    });

    return this.assignmentRepo.save(assignment);
  }

  async cancelShiftSignup(
    workspaceId: string,
    shiftId: string,
    requesterUserId: string,
  ): Promise<VolunteerAssignment> {
    await this.workspacesService.ensureMember(workspaceId, requesterUserId);

    const volunteer = await this.volunteerRepo.findOne({
      where: { workspaceId, userId: requesterUserId },
    });
    if (!volunteer) {
      throw new NotFoundException('Volunteer registration not found');
    }

    const assignment = await this.assignmentRepo.findOne({
      where: { shiftId, volunteerId: volunteer.id },
    });
    if (!assignment) {
      throw new NotFoundException('Shift assignment not found');
    }

    assignment.status = 'cancelled';
    return this.assignmentRepo.save(assignment);
  }

  // ─── Shift & Assignment Scheduling (Organizers) ──────────────────────────

  async getShifts(
    workspaceId: string,
    userId: string,
  ): Promise<VolunteerShift[]> {
    // Both organizers and members/volunteers can view shifts (organizers get details, volunteers view availability)
    return this.shiftRepo.find({
      where: { workspaceId },
      relations: { assignments: { volunteer: { user: true } } },
      order: { startAt: 'ASC' },
    });
  }

  async createShift(
    workspaceId: string,
    dto: CreateShiftDto,
    userId: string,
  ): Promise<VolunteerShift> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'volunteer.manage',
    );

    const shift = this.shiftRepo.create({
      workspaceId,
      title: dto.title,
      description: dto.description || null,
      role: dto.role,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      maxVolunteers: dto.maxVolunteers ?? 5,
    });

    return this.shiftRepo.save(shift);
  }

  async updateShift(
    workspaceId: string,
    shiftId: string,
    dto: UpdateShiftDto,
    userId: string,
  ): Promise<VolunteerShift> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'volunteer.manage',
    );

    const shift = await this.shiftRepo.findOne({
      where: { id: shiftId, workspaceId },
    });
    if (!shift) {
      throw new NotFoundException('Volunteer shift not found');
    }

    Object.assign(shift, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.role !== undefined && { role: dto.role }),
      ...(dto.startAt !== undefined && { startAt: new Date(dto.startAt) }),
      ...(dto.endAt !== undefined && { endAt: new Date(dto.endAt) }),
      ...(dto.maxVolunteers !== undefined && {
        maxVolunteers: dto.maxVolunteers,
      }),
    });

    return this.shiftRepo.save(shift);
  }

  async deleteShift(
    workspaceId: string,
    shiftId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'volunteer.manage',
    );

    const shift = await this.shiftRepo.findOne({
      where: { id: shiftId, workspaceId },
    });
    if (!shift) {
      throw new NotFoundException('Volunteer shift not found');
    }

    await this.shiftRepo.remove(shift);
  }

  async updateAssignment(
    workspaceId: string,
    assignmentId: string,
    dto: UpdateAssignmentDto,
    userId: string,
  ): Promise<VolunteerAssignment> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'volunteer.manage',
    );

    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: { shift: true, volunteer: { user: true } },
    });
    if (!assignment || assignment.shift.workspaceId !== workspaceId) {
      throw new NotFoundException(
        'Shift assignment not found in this workspace',
      );
    }

    Object.assign(assignment, {
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.serviceHours !== undefined && { serviceHours: dto.serviceHours }),
      ...(dto.feedback !== undefined && { feedback: dto.feedback }),
      ...(dto.rating !== undefined && { rating: dto.rating }),
    });

    return this.assignmentRepo.save(assignment);
  }
}
