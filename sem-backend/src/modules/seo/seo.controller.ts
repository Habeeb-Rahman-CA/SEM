import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../events/entities/event.entity';
import { Match } from '../competitions/entities/match.entity';
import { Player } from '../players/entities/player.entity';
import { Team } from '../teams/entities/team.entity';

/**
 * Robots + sitemap endpoints.
 *
 * Mounted at the URL root (see main.ts — global prefix excludes these
 * paths). Search engines fetch:
 *   - /robots.txt (crawl policy)
 *   - /sitemap.xml (dynamic list of public URLs)
 *
 * Sitemap enumerates: portal, live hub, every public event, every match
 * inside a public event, every player, and every team. Priorities and
 * changefreq are chosen to guide crawl budget toward live/current content.
 */
@ApiExcludeController()
@Controller()
export class SeoController {
  constructor(
    @InjectRepository(Event) private readonly eventRepo: Repository<Event>,
    @InjectRepository(Match) private readonly matchRepo: Repository<Match>,
    @InjectRepository(Player) private readonly playerRepo: Repository<Player>,
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
  ) {}

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  robots(): string {
    const origin = this.publicOrigin();
    return [
      'User-agent: *',
      'Allow: /',
      'Allow: /events',
      'Allow: /live',
      'Allow: /public/',
      'Allow: /share/',
      'Disallow: /login',
      'Disallow: /register',
      'Disallow: /workspaces',
      'Disallow: /profile',
      'Disallow: /system-settings',
      'Disallow: /api/',
      '',
      `Sitemap: ${origin}/sitemap.xml`,
      '',
    ].join('\n');
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=1800, s-maxage=3600')
  async sitemap(@Res() res: Response) {
    const origin = this.publicOrigin();

    const [events, players, teams] = await Promise.all([
      this.eventRepo.find({
        where: { isPublic: true },
        select: { id: true, updatedAt: true, status: true },
      }),
      // Cap enumeration so the sitemap stays under 50k URLs (Google's limit).
      // Real deployments should sitemap-index once this grows.
      this.playerRepo.find({
        select: { id: true, updatedAt: true },
        take: 20000,
      }),
      this.teamRepo.find({
        select: { id: true, updatedAt: true },
        take: 20000,
      }),
    ]);

    const eventIds = events.map((e) => e.id);
    const publicMatches = eventIds.length
      ? await this.matchRepo
          .createQueryBuilder('match')
          .innerJoin('match.stage', 'stage')
          .innerJoin('stage.competition', 'competition')
          .innerJoin('competition.event', 'event')
          .where('event.isPublic = :isPublic', { isPublic: true })
          .andWhere('event.deletedAt IS NULL')
          .andWhere('match.status IN (:...statuses)', {
            statuses: ['live', 'completed'],
          })
          .select(['match.id', 'match.updatedAt'])
          .take(30000)
          .getMany()
      : [];

    const now = new Date().toISOString();

    const urls: Array<{
      loc: string;
      lastmod?: string;
      changefreq?: string;
      priority?: string;
    }> = [
      { loc: `${origin}/`, changefreq: 'weekly', priority: '0.8' },
      { loc: `${origin}/events`, changefreq: 'daily', priority: '0.9' },
      { loc: `${origin}/live`, changefreq: 'always', priority: '0.9' },
    ];

    for (const e of events) {
      urls.push({
        loc: `${origin}/public/events/${e.id}`,
        lastmod: e.updatedAt?.toISOString() ?? now,
        changefreq: e.status === 'ongoing' ? 'hourly' : 'weekly',
        priority: e.status === 'ongoing' ? '0.9' : '0.7',
      });
    }
    for (const m of publicMatches) {
      urls.push({
        loc: `${origin}/public/matches/${m.id}`,
        lastmod: m.updatedAt?.toISOString() ?? now,
        changefreq: 'weekly',
        priority: '0.6',
      });
    }
    for (const p of players) {
      urls.push({
        loc: `${origin}/public/players/${p.id}`,
        lastmod: p.updatedAt?.toISOString() ?? now,
        changefreq: 'monthly',
        priority: '0.5',
      });
    }
    for (const t of teams) {
      urls.push({
        loc: `${origin}/public/teams/${t.id}`,
        lastmod: t.updatedAt?.toISOString() ?? now,
        changefreq: 'monthly',
        priority: '0.5',
      });
    }

    const xml = this.renderSitemapXml(urls);
    res.send(xml);
  }

  private renderSitemapXml(
    urls: Array<{
      loc: string;
      lastmod?: string;
      changefreq?: string;
      priority?: string;
    }>,
  ): string {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ];
    for (const u of urls) {
      lines.push('  <url>');
      lines.push(`    <loc>${this.escape(u.loc)}</loc>`);
      if (u.lastmod)
        lines.push(`    <lastmod>${this.escape(u.lastmod)}</lastmod>`);
      if (u.changefreq)
        lines.push(`    <changefreq>${this.escape(u.changefreq)}</changefreq>`);
      if (u.priority)
        lines.push(`    <priority>${this.escape(u.priority)}</priority>`);
      lines.push('  </url>');
    }
    lines.push('</urlset>');
    return lines.join('\n');
  }

  private publicOrigin(): string {
    // Prefer explicit env; fall back to a sensible default.
    return (
      process.env.PUBLIC_ORIGIN?.replace(/\/$/, '') ||
      process.env.APP_URL?.replace(/\/$/, '') ||
      'http://localhost'
    );
  }

  private escape(str: string): string {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
