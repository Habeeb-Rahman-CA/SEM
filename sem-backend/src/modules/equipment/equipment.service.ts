import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipment } from './entities/equipment.entity';
import { EquipmentBooking } from './entities/equipment-booking.entity';
import { EquipmentMaintenance } from './entities/equipment-maintenance.entity';
import { EquipmentHistory } from './entities/equipment-history.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    @InjectRepository(EquipmentBooking)
    private readonly bookingRepo: Repository<EquipmentBooking>,
    @InjectRepository(EquipmentMaintenance)
    private readonly maintenanceRepo: Repository<EquipmentMaintenance>,
    @InjectRepository(EquipmentHistory)
    private readonly historyRepo: Repository<EquipmentHistory>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // Log asset history helper
  private async logHistory(
    workspaceId: string,
    equipmentId: string,
    action: string,
    performedById: string,
    notes?: string,
  ): Promise<EquipmentHistory> {
    const log = this.historyRepo.create({
      workspaceId,
      equipmentId,
      action,
      performedById,
      notes: notes || null,
    });
    return this.historyRepo.save(log);
  }

  // ─── Equipment Inventory ─────────────────────────────────────────────────

  async getEquipment(
    workspaceId: string,
    userId: string,
  ): Promise<Equipment[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.equipmentRepo.find({
      where: { workspaceId },
      relations: { bookings: { bookedBy: true }, maintenance: true },
      order: { name: 'ASC' },
    });
  }

  async getEquipmentBySku(
    workspaceId: string,
    sku: string,
    userId: string,
  ): Promise<Equipment> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const equipment = await this.equipmentRepo.findOne({
      where: { workspaceId, sku },
      relations: {
        bookings: { bookedBy: true },
        maintenance: true,
        history: { performedBy: true },
      },
    });
    if (!equipment) {
      throw new NotFoundException(
        `Equipment with barcode/QR code "${sku}" not found`,
      );
    }
    return equipment;
  }

  async getEquipmentById(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<Equipment> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const equipment = await this.equipmentRepo.findOne({
      where: { workspaceId, id },
      relations: {
        bookings: { bookedBy: true, event: true },
        maintenance: true,
        history: { performedBy: true },
      },
    });
    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }
    return equipment;
  }

  async createEquipment(
    workspaceId: string,
    dto: CreateEquipmentDto,
    userId: string,
  ): Promise<Equipment> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    // Check SKU uniqueness inside the workspace if provided
    if (dto.sku) {
      const existing = await this.equipmentRepo.findOne({
        where: { workspaceId, sku: dto.sku },
      });
      if (existing) {
        throw new ConflictException(
          `Equipment with SKU/barcode "${dto.sku}" already exists`,
        );
      }
    }

    const equipment = this.equipmentRepo.create({
      workspaceId,
      name: dto.name,
      sku: dto.sku || null,
      category: dto.category || 'general',
      status: dto.status || 'available',
      condition: dto.condition || 'good',
      purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
      cost: dto.cost || null,
      location: dto.location || null,
      description: dto.description || null,
    });

    const saved = await this.equipmentRepo.save(equipment);
    await this.logHistory(
      workspaceId,
      saved.id,
      'created',
      userId,
      `Equipment registered: ${saved.name}`,
    );
    return saved;
  }

  async updateEquipment(
    workspaceId: string,
    id: string,
    dto: UpdateEquipmentDto,
    userId: string,
  ): Promise<Equipment> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const equipment = await this.equipmentRepo.findOne({
      where: { id, workspaceId },
    });
    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    if (dto.sku && dto.sku !== equipment.sku) {
      const existing = await this.equipmentRepo.findOne({
        where: { workspaceId, sku: dto.sku },
      });
      if (existing) {
        throw new ConflictException(
          `Equipment with SKU/barcode "${dto.sku}" already exists`,
        );
      }
    }

    const oldStatus = equipment.status;
    const oldCondition = equipment.condition;

    Object.assign(equipment, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.sku !== undefined && { sku: dto.sku }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.condition !== undefined && { condition: dto.condition }),
      ...(dto.purchaseDate !== undefined && {
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
      }),
      ...(dto.cost !== undefined && { cost: dto.cost }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.description !== undefined && { description: dto.description }),
    });

    const saved = await this.equipmentRepo.save(equipment);

    if (oldStatus !== saved.status) {
      await this.logHistory(
        workspaceId,
        saved.id,
        'status_changed',
        userId,
        `Status updated from ${oldStatus} to ${saved.status}`,
      );
    }
    if (oldCondition !== saved.condition) {
      await this.logHistory(
        workspaceId,
        saved.id,
        'condition_changed',
        userId,
        `Condition updated from ${oldCondition} to ${saved.condition}`,
      );
    }

    return saved;
  }

  async removeEquipment(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const equipment = await this.equipmentRepo.findOne({
      where: { id, workspaceId },
    });
    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }
    await this.equipmentRepo.remove(equipment);
  }

  // ─── Equipment Bookings ─────────────────────────────────────────────────

  async getBookings(
    workspaceId: string,
    userId: string,
  ): Promise<EquipmentBooking[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.bookingRepo.find({
      where: { workspaceId },
      relations: { equipment: true, bookedBy: true, event: true },
      order: { startAt: 'ASC' },
    });
  }

  async createBooking(
    workspaceId: string,
    dto: CreateBookingDto,
    userId: string,
  ): Promise<EquipmentBooking> {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const equipment = await this.equipmentRepo.findOne({
      where: { id: dto.equipmentId, workspaceId },
    });
    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }
    if (equipment.status === 'retired') {
      throw new ConflictException('Retired equipment cannot be booked');
    }

    const booking = this.bookingRepo.create({
      workspaceId,
      equipmentId: dto.equipmentId,
      eventId: dto.eventId || null,
      bookedById: userId,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      status: 'pending',
      notes: dto.notes || null,
    });

    const saved = await this.bookingRepo.save(booking);
    await this.logHistory(
      workspaceId,
      dto.equipmentId,
      'booked',
      userId,
      `Equipment booked from ${saved.startAt.toLocaleDateString()} to ${saved.endAt.toLocaleDateString()}`,
    );

    return saved;
  }

  async updateBooking(
    workspaceId: string,
    bookingId: string,
    dto: UpdateBookingDto,
    userId: string,
  ): Promise<EquipmentBooking> {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, workspaceId },
      relations: { equipment: true },
    });
    if (!booking) {
      throw new NotFoundException('Equipment booking not found');
    }

    const oldStatus = booking.status;

    Object.assign(booking, {
      ...(dto.startAt !== undefined && { startAt: new Date(dto.startAt) }),
      ...(dto.endAt !== undefined && { endAt: new Date(dto.endAt) }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    const saved = await this.bookingRepo.save(booking);

    if (oldStatus !== saved.status) {
      await this.logHistory(
        workspaceId,
        booking.equipmentId,
        `booking_${saved.status}`,
        userId,
        `Booking status changed from ${oldStatus} to ${saved.status}`,
      );

      // Auto update equipment status
      if (saved.status === 'active') {
        saved.equipment.status = 'booked';
        await this.equipmentRepo.save(saved.equipment);
      } else if (saved.status === 'returned' || saved.status === 'cancelled') {
        // Restore to available if there are no other active bookings or maintenance
        const activeBookings = await this.bookingRepo.count({
          where: { equipmentId: booking.equipmentId, status: 'active' },
        });
        const activeMaintenance = await this.maintenanceRepo.count({
          where: { equipmentId: booking.equipmentId, status: 'in_progress' },
        });
        if (activeBookings === 0 && activeMaintenance === 0) {
          saved.equipment.status = 'available';
          await this.equipmentRepo.save(saved.equipment);
        }
      }
    }

    return saved;
  }

  // ─── Equipment Maintenance Schedules ─────────────────────────────────────

  async getMaintenanceSchedules(
    workspaceId: string,
    userId: string,
  ): Promise<EquipmentMaintenance[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.maintenanceRepo.find({
      where: { workspaceId },
      relations: { equipment: true },
      order: { scheduledDate: 'ASC' },
    });
  }

  async createMaintenance(
    workspaceId: string,
    dto: CreateMaintenanceDto,
    userId: string,
  ): Promise<EquipmentMaintenance> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const equipment = await this.equipmentRepo.findOne({
      where: { id: dto.equipmentId, workspaceId },
    });
    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    const maintenance = this.maintenanceRepo.create({
      workspaceId,
      equipmentId: dto.equipmentId,
      title: dto.title,
      description: dto.description || null,
      maintenanceType: dto.maintenanceType || 'routine',
      scheduledDate: new Date(dto.scheduledDate),
      cost: dto.cost || null,
      performedBy: dto.performedBy || null,
      status: 'scheduled',
      notes: dto.notes || null,
    });

    const saved = await this.maintenanceRepo.save(maintenance);
    await this.logHistory(
      workspaceId,
      dto.equipmentId,
      'maintenance_scheduled',
      userId,
      `Maintenance scheduled for ${saved.scheduledDate.toLocaleDateString()}: ${saved.title}`,
    );

    return saved;
  }

  async updateMaintenance(
    workspaceId: string,
    maintenanceId: string,
    dto: UpdateMaintenanceDto,
    userId: string,
  ): Promise<EquipmentMaintenance> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const maintenance = await this.maintenanceRepo.findOne({
      where: { id: maintenanceId, workspaceId },
      relations: { equipment: true },
    });
    if (!maintenance) {
      throw new NotFoundException('Maintenance record not found');
    }

    const oldStatus = maintenance.status;

    Object.assign(maintenance, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.maintenanceType !== undefined && {
        maintenanceType: dto.maintenanceType,
      }),
      ...(dto.scheduledDate !== undefined && {
        scheduledDate: new Date(dto.scheduledDate),
      }),
      ...(dto.completedDate !== undefined && {
        completedDate: dto.completedDate ? new Date(dto.completedDate) : null,
      }),
      ...(dto.cost !== undefined && { cost: dto.cost }),
      ...(dto.performedBy !== undefined && { performedBy: dto.performedBy }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    const saved = await this.maintenanceRepo.save(maintenance);

    if (oldStatus !== saved.status) {
      await this.logHistory(
        workspaceId,
        maintenance.equipmentId,
        `maintenance_${saved.status}`,
        userId,
        `Maintenance status changed from ${oldStatus} to ${saved.status}`,
      );

      // Auto update equipment status
      if (saved.status === 'in_progress') {
        saved.equipment.status = 'maintenance';
        await this.equipmentRepo.save(saved.equipment);
      } else if (saved.status === 'completed' || saved.status === 'cancelled') {
        const activeBookings = await this.bookingRepo.count({
          where: { equipmentId: maintenance.equipmentId, status: 'active' },
        });
        const activeMaintenance = await this.maintenanceRepo.count({
          where: {
            equipmentId: maintenance.equipmentId,
            status: 'in_progress',
          },
        });
        if (activeBookings === 0 && activeMaintenance === 0) {
          saved.equipment.status = 'available';
          await this.equipmentRepo.save(saved.equipment);
        }
      }
    }

    return saved;
  }
}
