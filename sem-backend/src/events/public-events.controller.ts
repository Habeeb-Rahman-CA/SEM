import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CompetitionsService } from '../competitions/competitions.service';

@ApiTags('public-events')
@Controller('public/events')
export class PublicEventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly competitionsService: CompetitionsService,
  ) {}

  @Get(':eventId')
  @ApiOperation({
    summary: 'Get public event details',
    description: 'Returns the details of a published event without authentication.',
  })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Event details' })
  @ApiResponse({ status: 404, description: 'Event not found or not public' })
  async getPublicEvent(@Param('eventId') eventId: string) {
    return this.eventsService.getPublicEvent(eventId);
  }

  @Get(':eventId/competitions')
  @ApiOperation({ summary: 'List public competitions in an event' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Array of competitions' })
  async getPublicCompetitions(@Param('eventId') eventId: string) {
    return this.competitionsService.getPublicCompetitions(eventId);
  }

  @Get(':eventId/competitions/:competitionId/stages')
  @ApiOperation({ summary: 'List public competition stages' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiParam({ name: 'competitionId', description: 'Competition UUID' })
  @ApiResponse({ status: 200, description: 'Array of stages' })
  async getPublicStages(
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
  ) {
    return this.competitionsService.getPublicStages(eventId, competitionId);
  }

  @Get(':eventId/competitions/:competitionId/stages/:stageId/matches')
  @ApiOperation({ summary: 'List public matches in a stage' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiParam({ name: 'competitionId', description: 'Competition UUID' })
  @ApiParam({ name: 'stageId', description: 'Stage UUID' })
  @ApiResponse({ status: 200, description: 'Array of matches' })
  async getPublicMatches(
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
  ) {
    return this.competitionsService.getPublicMatches(eventId, competitionId, stageId);
  }

  @Get(':eventId/competitions/:competitionId/stats')
  @ApiOperation({ summary: 'Get public competition statistics' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiParam({ name: 'competitionId', description: 'Competition UUID' })
  @ApiResponse({ status: 200, description: 'Competition stats' })
  async getPublicCompetitionStats(
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
  ) {
    return this.competitionsService.getPublicCompetitionStats(eventId, competitionId);
  }

  @Get(':eventId/competitions/:competitionId/stages/:stageId/standings')
  @ApiOperation({ summary: 'Get public standings for a competition stage' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiParam({ name: 'competitionId', description: 'Competition UUID' })
  @ApiParam({ name: 'stageId', description: 'Stage UUID' })
  @ApiResponse({ status: 200, description: 'League table and/or knockout bracket progress' })
  async getPublicStandings(
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
  ) {
    return this.competitionsService.getPublicStandings(eventId, competitionId, stageId);
  }
}
