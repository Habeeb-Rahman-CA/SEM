import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { VolunteersService } from './volunteers.service';
import { Volunteer } from './entities/volunteer.entity';
import { VolunteerShift } from './entities/volunteer-shift.entity';
import { VolunteerAssignment } from './entities/volunteer-assignment.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';

describe('VolunteersService', () => {
  let service: VolunteersService;
  let volunteerRepo: Repository<Volunteer>;
  let shiftRepo: Repository<VolunteerShift>;
  let assignmentRepo: Repository<VolunteerAssignment>;
  let workspacesService: WorkspacesService;

  const mockVolunteerRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockShiftRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockAssignmentRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockWorkspacesService = {
    ensurePermission: jest.fn(),
    ensureMember: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VolunteersService,
        {
          provide: getRepositoryToken(Volunteer),
          useValue: mockVolunteerRepo,
        },
        {
          provide: getRepositoryToken(VolunteerShift),
          useValue: mockShiftRepo,
        },
        {
          provide: getRepositoryToken(VolunteerAssignment),
          useValue: mockAssignmentRepo,
        },
        {
          provide: WorkspacesService,
          useValue: mockWorkspacesService,
        },
      ],
    }).compile();

    service = module.get<VolunteersService>(VolunteersService);
    volunteerRepo = module.get<Repository<Volunteer>>(
      getRepositoryToken(Volunteer),
    );
    shiftRepo = module.get<Repository<VolunteerShift>>(
      getRepositoryToken(VolunteerShift),
    );
    assignmentRepo = module.get<Repository<VolunteerAssignment>>(
      getRepositoryToken(VolunteerAssignment),
    );
    workspacesService = module.get<WorkspacesService>(WorkspacesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerVolunteer', () => {
    it('should register a new volunteer successfully', async () => {
      mockWorkspacesService.ensureMember.mockResolvedValue(true);
      mockVolunteerRepo.findOne.mockResolvedValue(null);
      mockVolunteerRepo.create.mockReturnValue({
        id: 'vol-1',
        workspaceId: 'ws-1',
        userId: 'user-1',
        status: 'pending',
        skills: ['Medic'],
      });
      mockVolunteerRepo.save.mockResolvedValue({ id: 'vol-1' });
      mockVolunteerRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'vol-1',
          workspaceId: 'ws-1',
          userId: 'user-1',
          status: 'pending',
          skills: ['Medic'],
          user: { username: 'testuser' },
        });

      const result = await service.registerVolunteer(
        'ws-1',
        { skills: ['Medic'] },
        'user-1',
      );
      expect(result).toBeDefined();
      expect(result.id).toBe('vol-1');
      expect(mockVolunteerRepo.create).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        userId: 'user-1',
        status: 'pending',
        skills: ['Medic'],
        notes: null,
      });
    });

    it('should throw ConflictException if volunteer already registered', async () => {
      mockWorkspacesService.ensureMember.mockResolvedValue(true);
      mockVolunteerRepo.findOne.mockResolvedValue({ id: 'vol-1' });

      await expect(
        service.registerVolunteer('ws-1', { skills: ['Medic'] }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getVolunteerProfile', () => {
    it('should calculate completed shifts and total service hours correctly', async () => {
      mockWorkspacesService.ensureMember.mockResolvedValue(true);
      mockVolunteerRepo.findOne.mockResolvedValue({
        id: 'vol-1',
        assignments: [
          { status: 'attended', serviceHours: 4.5 },
          { status: 'attended', serviceHours: 2.0 },
          { status: 'absent', serviceHours: 0 },
        ],
      });

      const result = await service.getVolunteerProfile('ws-1', 'user-1');
      expect(result.stats.totalShifts).toBe(3);
      expect(result.stats.completedShifts).toBe(2);
      expect(result.stats.serviceHours).toBe(6.5);
    });
  });

  describe('signupForShift', () => {
    it('should throw ForbiddenException if volunteer not approved', async () => {
      mockWorkspacesService.ensureMember.mockResolvedValue(true);
      mockVolunteerRepo.findOne.mockResolvedValue({
        id: 'vol-1',
        status: 'pending',
      });

      await expect(
        service.signupForShift('ws-1', 'shift-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should sign up successfully if status is approved and shift has spots', async () => {
      mockWorkspacesService.ensureMember.mockResolvedValue(true);
      mockVolunteerRepo.findOne.mockResolvedValue({
        id: 'vol-1',
        status: 'approved',
      });
      mockShiftRepo.findOne.mockResolvedValue({
        id: 'shift-1',
        maxVolunteers: 3,
        assignments: [{ status: 'assigned' }],
      });
      mockAssignmentRepo.findOne.mockResolvedValue(null);
      mockAssignmentRepo.create.mockReturnValue({
        shiftId: 'shift-1',
        volunteerId: 'vol-1',
        status: 'assigned',
      });
      mockAssignmentRepo.save.mockResolvedValue({ id: 'assign-1' });

      const result = await service.signupForShift('ws-1', 'shift-1', 'user-1');
      expect(result).toBeDefined();
      expect(mockAssignmentRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if shift is full', async () => {
      mockWorkspacesService.ensureMember.mockResolvedValue(true);
      mockVolunteerRepo.findOne.mockResolvedValue({
        id: 'vol-1',
        status: 'approved',
      });
      mockShiftRepo.findOne.mockResolvedValue({
        id: 'shift-1',
        maxVolunteers: 2,
        assignments: [{ status: 'assigned' }, { status: 'assigned' }],
      });

      await expect(
        service.signupForShift('ws-1', 'shift-1', 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateAssignment', () => {
    it('should update service hours and rating successfully', async () => {
      mockWorkspacesService.ensurePermission.mockResolvedValue(true);
      mockAssignmentRepo.findOne.mockResolvedValue({
        id: 'assign-1',
        shift: { workspaceId: 'ws-1' },
        status: 'assigned',
        serviceHours: 0,
      });
      mockAssignmentRepo.save.mockImplementation((val) => Promise.resolve(val));

      const result = await service.updateAssignment(
        'ws-1',
        'assign-1',
        {
          status: 'attended',
          serviceHours: 3.5,
          rating: 5,
          feedback: 'Great job!',
        },
        'user-1',
      );

      expect(result.status).toBe('attended');
      expect(result.serviceHours).toBe(3.5);
      expect(result.rating).toBe(5);
      expect(result.feedback).toBe('Great job!');
    });
  });
});
