import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { EventsService } from '../events/events.service';
import { PlayersService } from '../players/players.service';
import { TeamsService } from '../teams/teams.service';
import { CompetitionsService } from '../competitions/competitions.service';

/**
 * Bot-friendly Open Graph share endpoints.
 *
 * Users share URLs like `/share/events/:id`. Bots/link scrapers (Facebook,
 * WhatsApp, iMessage, Slack, Twitter, LinkedIn) fetch this URL and see a
 * minimal HTML page with OG metadata — real browsers execute the redirect
 * script and land on the SPA at the corresponding /public/* URL.
 *
 * We intentionally do not gate by user-agent — bots and browsers both get
 * the OG-tagged page. Bots read the tags; browsers redirect in ~0 ms.
 */
@ApiExcludeController()
@Controller('share')
export class ShareController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly playersService: PlayersService,
    private readonly teamsService: TeamsService,
    private readonly competitionsService: CompetitionsService,
  ) {}

  @Get('events/:id')
  async shareEvent(@Param('id') id: string, @Res() res: Response) {
    try {
      const evt = await this.eventsService.getPublicEvent(id);
      const title = evt.name;
      const desc =
        evt.description ||
        `${evt.venue ?? 'Sports event'} · ${
          evt.startDate ? new Date(evt.startDate).toDateString() : 'Dates TBA'
        }`;
      res.send(
        this.buildHtml({
          title,
          description: desc,
          image: evt.logoUrl,
          redirectTo: `/public/events/${evt.id}`,
        }),
      );
    } catch {
      res.status(404).send(this.notFoundHtml());
    }
  }

  @Get('matches/:id')
  async shareMatch(@Param('id') id: string, @Res() res: Response) {
    try {
      const m = await this.competitionsService.getPublicMatchDetails(id);
      const home = m.homeTeam?.name ?? 'Home';
      const away = m.awayTeam?.name ?? 'Away';
      const title = `${home} ${m.homeScore ?? 0} – ${m.awayScore ?? 0} ${away}`;
      const desc =
        (m.summary as string | null) ||
        `${m.competition?.name ?? 'Match'} · ${m.event?.name ?? ''}`;
      res.send(
        this.buildHtml({
          title,
          description: desc,
          image: m.event?.logoUrl ?? m.homeTeam?.logoUrl ?? null,
          redirectTo: `/public/matches/${m.id}`,
        }),
      );
    } catch {
      res.status(404).send(this.notFoundHtml());
    }
  }

  @Get('players/:id')
  async sharePlayer(@Param('id') id: string, @Res() res: Response) {
    try {
      const profile = await this.playersService.getPublicPlayerProfile(id);
      const p = profile.player;
      const stats = profile.allTime;
      const title = `${p.user.username}${
        p.jerseyNumber ? ` #${p.jerseyNumber}` : ''
      } · ${p.team.name}`;
      const desc = p.bio || this.playerSummary(stats);
      res.send(
        this.buildHtml({
          title,
          description: desc,
          image: p.user.avatarUrl ?? p.team.logoUrl ?? null,
          redirectTo: `/public/players/${p.id}`,
        }),
      );
    } catch {
      res.status(404).send(this.notFoundHtml());
    }
  }

  @Get('teams/:id')
  async shareTeam(@Param('id') id: string, @Res() res: Response) {
    try {
      const profile = await this.teamsService.getPublicTeamProfile(id);
      const t = profile.team;
      const stats = profile.allTime;
      const title = `${t.name} · ${t.code}`;
      const desc =
        t.description ||
        `${stats.participations} competitions · ${stats.totalGames} matches · ${stats.mvps} MVPs`;
      res.send(
        this.buildHtml({
          title,
          description: desc,
          image: t.logoUrl,
          redirectTo: `/public/teams/${t.id}`,
        }),
      );
    } catch {
      res.status(404).send(this.notFoundHtml());
    }
  }

  private playerSummary(stats: any): string {
    const bits: string[] = [];
    if (stats.gamesPlayed) bits.push(`${stats.gamesPlayed} games`);
    if (stats.goals) bits.push(`${stats.goals} goals`);
    if (stats.runs) bits.push(`${stats.runs} runs`);
    if (stats.mvps) bits.push(`${stats.mvps} MVPs`);
    if (stats.avgRating) bits.push(`avg ${stats.avgRating.toFixed(2)}`);
    return bits.length ? bits.join(' · ') : 'Sports Event Management';
  }

  private buildHtml(opts: {
    title: string;
    description: string;
    image?: string | null;
    redirectTo: string;
  }): string {
    const safeTitle = this.escape(opts.title);
    const safeDesc = this.escape(opts.description).slice(0, 200);
    const image = opts.image ? this.escape(opts.image) : '';
    const to = this.escape(opts.redirectTo);
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  ${image ? `<meta property="og:image" content="${image}" />` : ''}

  <!-- Twitter -->
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  ${image ? `<meta name="twitter:image" content="${image}" />` : ''}

  <!-- Redirect real browsers straight to the SPA -->
  <meta http-equiv="refresh" content="0; url=${to}" />
  <link rel="canonical" href="${to}" />
</head>
<body>
  <p>Opening <a href="${to}">${safeTitle}</a>…</p>
  <script>window.location.replace(${JSON.stringify(opts.redirectTo)});</script>
</body>
</html>`;
  }

  private notFoundHtml(): string {
    return this.buildHtml({
      title: 'Not found',
      description: 'This link is no longer available.',
      redirectTo: '/events',
    });
  }

  private escape(str: string): string {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
