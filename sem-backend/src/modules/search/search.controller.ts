import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { WorkspaceMembersService } from '../workspaces/members/members.service';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly workspaceMembersService: WorkspaceMembersService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Perform a workspace-scoped global search in Elasticsearch/OpenSearch',
  })
  @ApiQuery({ name: 'workspaceId', type: 'string', required: true })
  @ApiQuery({ name: 'q', type: 'string', required: true })
  async globalSearch(
    @Query('workspaceId') workspaceId: string,
    @Query('q') query: string,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    const userId = user.id;
    // Secure authorization boundary check
    await this.workspaceMembersService.ensureMember(workspaceId, userId);
    return this.searchService.globalSearch(workspaceId, query);
  }
}
