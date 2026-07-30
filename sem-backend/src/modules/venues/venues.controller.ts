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
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const WS = { name: 'workspaceId', description: 'Workspace UUID' };
const VENUE = { name: 'venueId', description: 'Venue UUID' };

@ApiTags('venues')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/venues')
@UseGuards(JwtAuthGuard)
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  @ApiOperation({
    summary: 'List venues in a workspace',
    description:
      'Returns all venues (stadiums, courts, pitches) registered in the workspace. Venues can be assigned to individual matches.',
  })
  @ApiParam(WS)
  @ApiResponse({ status: 200, description: 'Array of venue objects' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Not a member of this workspace' })
  getVenues(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.venuesService.getVenues(workspaceId, req.user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a venue',
    description:
      'Registers a new venue in the workspace with name, location, and capacity details.',
  })
  @ApiParam(WS)
  @ApiResponse({ status: 201, description: 'Venue created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  createVenue(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateVenueDto,
    @Request() req: any,
  ) {
    return this.venuesService.createVenue(workspaceId, dto, req.user.id);
  }

  @Patch(':venueId')
  @ApiOperation({
    summary: 'Update a venue',
    description: 'Updates venue details such as name, address, or capacity.',
  })
  @ApiParam(WS)
  @ApiParam(VENUE)
  @ApiResponse({ status: 200, description: 'Updated venue' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Venue not found' })
  updateVenue(
    @Param('workspaceId') workspaceId: string,
    @Param('venueId') venueId: string,
    @Body() dto: UpdateVenueDto,
    @Request() req: any,
  ) {
    return this.venuesService.updateVenue(
      workspaceId,
      venueId,
      dto,
      req.user.id,
    );
  }

  @Delete(':venueId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a venue',
    description:
      'Permanently removes the venue from the workspace. Matches already assigned to this venue will retain the association.',
  })
  @ApiParam(WS)
  @ApiParam(VENUE)
  @ApiResponse({ status: 204, description: 'Venue deleted' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Venue not found' })
  removeVenue(
    @Param('workspaceId') workspaceId: string,
    @Param('venueId') venueId: string,
    @Request() req: any,
  ) {
    return this.venuesService.removeVenue(workspaceId, venueId, req.user.id);
  }
}
