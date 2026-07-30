import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CompetitionsService } from '../competitions/competitions.service';
import { SearchPublicEventsDto } from './dto/search-public-events.dto';

@ApiTags('public-events')
@Controller('public/events')
export class PublicEventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly competitionsService: CompetitionsService,
  ) {}

  @Get('live-matches')
  @ApiOperation({
    summary: 'List all currently live matches across published events',
    description:
      'Returns every match with status="live" that belongs to a public event. Supports optional filtering by sport code or a specific event.',
  })
  @ApiQuery({
    name: 'sport',
    required: false,
    description: 'Sport code, e.g. football',
  })
  @ApiQuery({ name: 'eventId', required: false })
  @ApiResponse({ status: 200, description: 'Array of live match summaries' })
  async getLiveMatches(
    @Query('sport') sport?: string,
    @Query('eventId') eventId?: string,
  ) {
    return this.competitionsService.getPublicLiveMatches({ sport, eventId });
  }

  @Get()
  @ApiOperation({
    summary: 'Browse published events (public portal)',
    description:
      'Returns a paginated list of events where isPublic=true. Supports filtering by status (upcoming/ongoing/completed), sport, venue and free-text search across name/description/venue/organizers.',
  })
  @ApiQuery({ name: 'query', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['upcoming', 'ongoing', 'completed'],
  })
  @ApiQuery({ name: 'sport', required: false })
  @ApiQuery({ name: 'venue', required: false })
  @ApiQuery({ name: 'limit', required: false, example: 24 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['startDate', 'name', 'status'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({ status: 200, description: 'Paginated list of public events' })
  async listPublicEvents(@Query() dto: SearchPublicEventsDto) {
    return this.eventsService.searchPublicEvents(dto);
  }

  @Get(':eventId')
  @ApiOperation({
    summary: 'Get public event details',
    description:
      'Returns the details of a published event without authentication.',
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
    return this.competitionsService.getPublicMatches(
      eventId,
      competitionId,
      stageId,
    );
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
    return this.competitionsService.getPublicCompetitionStats(
      eventId,
      competitionId,
    );
  }

  @Get(':eventId/competitions/:competitionId/stages/:stageId/standings')
  @ApiOperation({ summary: 'Get public standings for a competition stage' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiParam({ name: 'competitionId', description: 'Competition UUID' })
  @ApiParam({ name: 'stageId', description: 'Stage UUID' })
  @ApiResponse({
    status: 200,
    description: 'League table and/or knockout bracket progress',
  })
  async getPublicStandings(
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
  ) {
    return this.competitionsService.getPublicStandings(
      eventId,
      competitionId,
      stageId,
    );
  }

  @Get(':eventId/competitions/:competitionId/results')
  @ApiOperation({
    summary: 'Get public completed match results for a competition',
  })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiParam({ name: 'competitionId', description: 'Competition UUID' })
  @ApiResponse({
    status: 200,
    description: 'Completed results grouped by date with MVP and player stats',
  })
  async getPublicResults(
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
  ) {
    return this.competitionsService.getPublicResults(eventId, competitionId);
  }
}
