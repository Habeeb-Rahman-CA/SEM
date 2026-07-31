import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const WS = { name: 'workspaceId', description: 'Workspace UUID' };
const EQ = { name: 'id', description: 'Equipment UUID' };
const BOOKING = { name: 'bookingId', description: 'Booking UUID' };
const MAINT = { name: 'maintenanceId', description: 'Maintenance Record UUID' };

@ApiTags('equipment')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  // ─── Equipment Inventory ─────────────────────────────────────────────────

  @Get('equipment')
  @ApiOperation({ summary: 'List all equipment in a workspace' })
  @ApiParam(WS)
  getEquipment(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.equipmentService.getEquipment(workspaceId, req.user.id);
  }

  @Get('equipment/scan/:sku')
  @ApiOperation({ summary: 'Get equipment details by barcode or QR code scan' })
  @ApiParam(WS)
  @ApiParam({ name: 'sku', description: 'Barcode SKU code value' })
  getEquipmentBySku(
    @Param('workspaceId') workspaceId: string,
    @Param('sku') sku: string,
    @Request() req: any,
  ) {
    return this.equipmentService.getEquipmentBySku(
      workspaceId,
      sku,
      req.user.id,
    );
  }

  @Get('equipment/:id')
  @ApiOperation({ summary: 'Get detailed equipment profile and history' })
  @ApiParam(WS)
  @ApiParam(EQ)
  getEquipmentById(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.equipmentService.getEquipmentById(workspaceId, id, req.user.id);
  }

  @Post('equipment')
  @ApiOperation({ summary: 'Register new equipment asset' })
  @ApiParam(WS)
  createEquipment(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateEquipmentDto,
    @Request() req: any,
  ) {
    return this.equipmentService.createEquipment(workspaceId, dto, req.user.id);
  }

  @Patch('equipment/:id')
  @ApiOperation({ summary: 'Update equipment details' })
  @ApiParam(WS)
  @ApiParam(EQ)
  updateEquipment(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentDto,
    @Request() req: any,
  ) {
    return this.equipmentService.updateEquipment(
      workspaceId,
      id,
      dto,
      req.user.id,
    );
  }

  @Delete('equipment/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete equipment asset' })
  @ApiParam(WS)
  @ApiParam(EQ)
  removeEquipment(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.equipmentService.removeEquipment(workspaceId, id, req.user.id);
  }

  // ─── Equipment Bookings ─────────────────────────────────────────────────

  @Get('equipment-bookings')
  @ApiOperation({ summary: 'List all equipment booking records' })
  @ApiParam(WS)
  getBookings(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.equipmentService.getBookings(workspaceId, req.user.id);
  }

  @Post('equipment-bookings')
  @ApiOperation({ summary: 'Book equipment for an event' })
  @ApiParam(WS)
  createBooking(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateBookingDto,
    @Request() req: any,
  ) {
    return this.equipmentService.createBooking(workspaceId, dto, req.user.id);
  }

  @Patch('equipment-bookings/:bookingId')
  @ApiOperation({ summary: 'Approve, check out, return, or cancel booking' })
  @ApiParam(WS)
  @ApiParam(BOOKING)
  updateBooking(
    @Param('workspaceId') workspaceId: string,
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateBookingDto,
    @Request() req: any,
  ) {
    return this.equipmentService.updateBooking(
      workspaceId,
      bookingId,
      dto,
      req.user.id,
    );
  }

  // ─── Equipment Maintenance Schedules ─────────────────────────────────────

  @Get('equipment-maintenance')
  @ApiOperation({ summary: 'List all maintenance logs' })
  @ApiParam(WS)
  getMaintenanceSchedules(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    return this.equipmentService.getMaintenanceSchedules(
      workspaceId,
      req.user.id,
    );
  }

  @Post('equipment-maintenance')
  @ApiOperation({ summary: 'Schedule equipment maintenance' })
  @ApiParam(WS)
  createMaintenance(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateMaintenanceDto,
    @Request() req: any,
  ) {
    return this.equipmentService.createMaintenance(
      workspaceId,
      dto,
      req.user.id,
    );
  }

  @Patch('equipment-maintenance/:maintenanceId')
  @ApiOperation({ summary: 'Update maintenance logs' })
  @ApiParam(WS)
  @ApiParam(MAINT)
  updateMaintenance(
    @Param('workspaceId') workspaceId: string,
    @Param('maintenanceId') maintenanceId: string,
    @Body() dto: UpdateMaintenanceDto,
    @Request() req: any,
  ) {
    return this.equipmentService.updateMaintenance(
      workspaceId,
      maintenanceId,
      dto,
      req.user.id,
    );
  }
}
