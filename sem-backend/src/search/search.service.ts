import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { WorkspaceFile } from '../workspaces/entities/workspace-file.entity';
import { Team } from '../workspaces/entities/team.entity';
import { Player } from '../workspaces/entities/player.entity';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private isElasticActive = false;

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @InjectRepository(WorkspaceFile)
    private readonly fileRepo: Repository<WorkspaceFile>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
  ) {}

  onModuleInit() {
    // Run initialization asynchronously so it doesn't block application startup
    this.initializeElastic().catch((err) => {
      this.logger.error(
        'Unexpected error during Elasticsearch initialization:',
        err,
      );
    });
  }

  private async initializeElastic() {
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Elasticsearch ping timeout')),
          2000,
        );
      });

      // Ping Elasticsearch with a 2-second timeout to check connectivity
      await Promise.race([this.elasticsearchService.ping(), timeoutPromise]);
      this.isElasticActive = true;
      this.logger.log('Successfully connected to Elasticsearch/OpenSearch.');

      // Initialize indexes
      await this.createIndex('workspace_files');
      await this.createIndex('teams');
      await this.createIndex('players');
    } catch {
      this.logger.warn(
        'Elasticsearch/OpenSearch is offline or misconfigured. Falling back to DB search.',
      );
      this.isElasticActive = false;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private async createIndex(indexName: string) {
    if (!this.isElasticActive) return;
    try {
      const exists = await this.elasticsearchService.indices.exists({
        index: indexName,
      });
      if (!exists) {
        await this.elasticsearchService.indices.create({ index: indexName });
        this.logger.log(`Created Elasticsearch index: ${indexName}`);
      }
    } catch (err) {
      this.logger.error(`Failed to create index ${indexName}:`, err);
    }
  }

  // ── Sync Actions ───────────────────────────────────────────────────────────

  async indexFile(file: WorkspaceFile) {
    if (!this.isElasticActive) return;
    try {
      await this.elasticsearchService.index({
        index: 'workspace_files',
        id: file.id,
        document: {
          id: file.id,
          workspaceId: file.workspaceId,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          virusScanStatus: file.virusScanStatus,
          createdAt: file.createdAt,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to index file ${file.id}:`, err);
    }
  }

  async deleteFile(fileId: string) {
    if (!this.isElasticActive) return;
    try {
      await this.elasticsearchService.delete({
        index: 'workspace_files',
        id: fileId,
      });
    } catch (err) {
      // Ignore if document not found
      const errorObj = err as { meta?: { statusCode?: number } };
      if (errorObj.meta?.statusCode !== 404) {
        this.logger.error(`Failed to delete indexed file ${fileId}:`, err);
      }
    }
  }

  async indexTeam(team: Team) {
    if (!this.isElasticActive) return;
    try {
      await this.elasticsearchService.index({
        index: 'teams',
        id: team.id,
        document: {
          id: team.id,
          workspaceId: team.workspaceId,
          name: team.name,
          code: team.code,
          description: team.description,
          logoUrl: team.logoUrl,
          createdAt: team.createdAt,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to index team ${team.id}:`, err);
    }
  }

  async deleteTeam(teamId: string) {
    if (!this.isElasticActive) return;
    try {
      await this.elasticsearchService.delete({
        index: 'teams',
        id: teamId,
      });
    } catch (err) {
      const errorObj = err as { meta?: { statusCode?: number } };
      if (errorObj.meta?.statusCode !== 404) {
        this.logger.error(`Failed to delete indexed team ${teamId}:`, err);
      }
    }
  }

  async indexPlayer(player: Player) {
    if (!this.isElasticActive) return;
    try {
      await this.elasticsearchService.index({
        index: 'players',
        id: player.id,
        document: {
          id: player.id,
          workspaceId: player.workspaceId,
          userId: player.userId,
          username: player.user?.username || '',
          teamId: player.teamId,
          teamName: player.team?.name || '',
          jerseyNumber: player.jerseyNumber,
          createdAt: player.createdAt,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to index player ${player.id}:`, err);
    }
  }

  async deletePlayer(playerId: string) {
    if (!this.isElasticActive) return;
    try {
      await this.elasticsearchService.delete({
        index: 'players',
        id: playerId,
      });
    } catch (err) {
      const errorObj = err as { meta?: { statusCode?: number } };
      if (errorObj.meta?.statusCode !== 404) {
        this.logger.error(`Failed to delete indexed player ${playerId}:`, err);
      }
    }
  }

  // ── Global Search Querying ─────────────────────────────────────────────────

  async globalSearch(workspaceId: string, query: string) {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) {
      return { files: [], teams: [], players: [] };
    }

    if (this.isElasticActive) {
      try {
        return await this.searchElastic(workspaceId, cleanQuery);
      } catch (err) {
        this.logger.error(
          'Elasticsearch search request failed, falling back to DB:',
          err,
        );
        return this.searchDb(workspaceId, cleanQuery);
      }
    } else {
      return this.searchDb(workspaceId, cleanQuery);
    }
  }

  private async searchElastic(workspaceId: string, query: string) {
    // Search files
    const fileResult = await this.elasticsearchService.search({
      index: 'workspace_files',
      query: {
        bool: {
          must: [
            { term: { workspaceId } },
            { match: { name: { query, fuzziness: 'AUTO' } } },
          ],
        },
      },
    });
    const files = fileResult.hits.hits.map((h) => h._source);

    // Search teams
    const teamResult = await this.elasticsearchService.search({
      index: 'teams',
      query: {
        bool: {
          must: [
            { term: { workspaceId } },
            {
              bool: {
                should: [
                  { match: { name: { query, fuzziness: 'AUTO' } } },
                  { match: { code: { query, fuzziness: 'AUTO' } } },
                  { match: { description: { query, fuzziness: 'AUTO' } } },
                ],
              },
            },
          ],
        },
      },
    });
    const teams = teamResult.hits.hits.map((h) => h._source);

    // Search players
    const playerResult = await this.elasticsearchService.search({
      index: 'players',
      query: {
        bool: {
          must: [
            { term: { workspaceId } },
            {
              bool: {
                should: [
                  { match: { username: { query, fuzziness: 'AUTO' } } },
                  { match: { teamName: { query, fuzziness: 'AUTO' } } },
                ],
              },
            },
          ],
        },
      },
    });
    const players = playerResult.hits.hits.map((h) => h._source);

    return { files, teams, players };
  }

  private async searchDb(workspaceId: string, query: string) {
    const likeQuery = `%${query}%`;

    const files = await this.fileRepo.find({
      where: {
        workspaceId,
        name: Like(likeQuery),
        isDeleted: false,
      },
      take: 20,
    });

    const teams = await this.teamRepo.find({
      where: [
        { workspaceId, name: Like(likeQuery), isDeleted: false },
        { workspaceId, code: Like(likeQuery), isDeleted: false },
      ],
      take: 20,
    });

    const players = await this.playerRepo.find({
      where: [
        { workspaceId, user: { username: Like(likeQuery) }, isDeleted: false },
      ],
      relations: { user: true, team: true },
      take: 20,
    });

    return { files, teams, players };
  }
}
