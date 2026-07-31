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
import { VolunteersService } from './volunteers.service';
import { CreateVolunteerDto } from './dto/create-volunteer.dto';
import { UpdateVolunteerDto } from './dto/update-volunteer.dto';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const WS = { name: 'workspaceId', description: 'Workspace UUID' };

@ApiTags('volunteers')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/volunteers')
@UseGuards(JwtAuthGuard)
export class VolunteersController {
  constructor(private readonly volunteersService: VolunteersService) {}

  @Get()
  @ApiOperation({ summary: 'List all volunteers in a workspace (Organizer)' })
  @ApiParam(WS)
  getVolunteers(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    return this.volunteersService.getVolunteers(workspaceId, req.user.id);
  }

  @Patch(':volunteerId')
  @ApiOperation({
    summary: 'Update volunteer registration status/notes (Organizer)',
  })
  @ApiParam(WS)
  updateVolunteer(
    @Param('workspaceId') workspaceId: string,
    @Param('volunteerId') volunteerId: string,
    @Body() dto: UpdateVolunteerDto,
    @Request() req: any,
  ) {
    return this.volunteersService.updateVolunteer(
      workspaceId,
      volunteerId,
      dto,
      req.user.id,
    );
  }

  @Delete(':volunteerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a volunteer registration (Organizer)' })
  @ApiParam(WS)
  deleteVolunteer(
    @Param('workspaceId') workspaceId: string,
    @Param('volunteerId') volunteerId: string,
    @Request() req: any,
  ) {
    return this.volunteersService.deleteVolunteer(
      workspaceId,
      volunteerId,
      req.user.id,
    );
  }

  @Post('register')
  @ApiOperation({ summary: 'Register/apply as a volunteer' })
  @ApiParam(WS)
  registerVolunteer(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateVolunteerDto,
    @Request() req: any,
  ) {
    return this.volunteersService.registerVolunteer(
      workspaceId,
      dto,
      req.user.id,
    );
  }

  @Get('profile')
  @ApiOperation({
    summary: 'Get current volunteer profile stats & assignments',
  })
  @ApiParam(WS)
  getVolunteerProfile(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    return this.volunteersService.getVolunteerProfile(workspaceId, req.user.id);
  }

  @Get('shifts')
  @ApiOperation({ summary: 'Get list of shifts' })
  @ApiParam(WS)
  getShifts(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.volunteersService.getShifts(workspaceId, req.user.id);
  }

  @Post('shifts')
  @ApiOperation({ summary: 'Create a volunteer shift (Organizer)' })
  @ApiParam(WS)
  createShift(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateShiftDto,
    @Request() req: any,
  ) {
    return this.volunteersService.createShift(workspaceId, dto, req.user.id);
  }

  @Patch('shifts/:shiftId')
  @ApiOperation({ summary: 'Update a volunteer shift (Organizer)' })
  @ApiParam(WS)
  updateShift(
    @Param('workspaceId') workspaceId: string,
    @Param('shiftId') shiftId: string,
    @Body() dto: UpdateShiftDto,
    @Request() req: any,
  ) {
    return this.volunteersService.updateShift(
      workspaceId,
      shiftId,
      dto,
      req.user.id,
    );
  }

  @Delete('shifts/:shiftId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a volunteer shift (Organizer)' })
  @ApiParam(WS)
  deleteShift(
    @Param('workspaceId') workspaceId: string,
    @Param('shiftId') shiftId: string,
    @Request() req: any,
  ) {
    return this.volunteersService.deleteShift(
      workspaceId,
      shiftId,
      req.user.id,
    );
  }

  @Post('shifts/:shiftId/signup')
  @ApiOperation({ summary: 'Sign up for a shift (Volunteer)' })
  @ApiParam(WS)
  signupForShift(
    @Param('workspaceId') workspaceId: string,
    @Param('shiftId') shiftId: string,
    @Request() req: any,
  ) {
    return this.volunteersService.signupForShift(
      workspaceId,
      shiftId,
      req.user.id,
    );
  }

  @Post('shifts/:shiftId/cancel')
  @ApiOperation({ summary: 'Cancel registration for a shift (Volunteer)' })
  @ApiParam(WS)
  cancelShiftSignup(
    @Param('workspaceId') workspaceId: string,
    @Param('shiftId') shiftId: string,
    @Request() req: any,
  ) {
    return this.volunteersService.cancelShiftSignup(
      workspaceId,
      shiftId,
      req.user.id,
    );
  }

  @Patch('assignments/:assignmentId')
  @ApiOperation({
    summary: 'Update volunteer assignment status/feedback (Organizer)',
  })
  @ApiParam(WS)
  updateAssignment(
    @Param('workspaceId') workspaceId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
    @Request() req: any,
  ) {
    return this.volunteersService.updateAssignment(
      workspaceId,
      assignmentId,
      dto,
      req.user.id,
    );
  }
}
