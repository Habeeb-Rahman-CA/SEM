import { Injectable, WritableSignal, inject } from '@angular/core';
import { TeamService } from '../../teams/services/team.service';
import { PlayerService } from '../../players/services/player.service';
import { VenueService } from '../../venues/services/venue.service';
import { UiService } from '../../../core/services/ui.service';

import type { Team, Player, Match } from './workspace.service';
import type { Venue } from '../../venues/services/venue.service';

interface DeleteVenueArgs {
  workspaceId: string;
  venue: Venue;
  venues: WritableSignal<Venue[]>;
  matches: WritableSignal<Match[]>;
}

interface DeleteTeamArgs {
  workspaceId: string;
  team: Team;
  teams: WritableSignal<Team[]>;
  matches: WritableSignal<Match[]>;
}

interface DeletePlayerArgs {
  workspaceId: string;
  player: Player;
  players: WritableSignal<Player[]>;
}

/**
 * Encapsulates the optimistic-update + rollback flow used by
 * WorkspaceDetailComponent when deleting teams, players and venues.
 * The component signals are passed in so the service can mutate them
 * without needing to know about the component instance.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceCrudService {
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private venueService = inject(VenueService);
  private uiService = inject(UiService);

  async deleteVenue(args: DeleteVenueArgs): Promise<boolean> {
    const { workspaceId, venue, venues, matches } = args;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Venue',
      message: `Delete venue "${venue.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return false;

    const originalVenues = venues();
    const originalMatches = matches();
    venues.update((prev) => prev.filter((v) => v.id !== venue.id));
    matches.update((prev) =>
      prev.map((m) => (m.venueId === venue.id ? { ...m, venueId: null, venue: null } : m)),
    );

    return new Promise((resolve) => {
      this.venueService.removeVenue(workspaceId, venue.id).subscribe({
        next: () => {
          this.uiService.success(`Venue "${venue.name}" deleted successfully.`);
          resolve(true);
        },
        error: (err) => {
          venues.set(originalVenues);
          matches.set(originalMatches);
          this.uiService.error(err.error?.message ?? 'Failed to delete venue.');
          resolve(false);
        },
      });
    });
  }

  async deleteTeam(args: DeleteTeamArgs): Promise<boolean> {
    const { workspaceId, team, teams, matches } = args;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Team',
      message: `Delete team "${team.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return false;

    const originalTeams = teams();
    const originalMatches = matches();

    teams.update((prev) => prev.filter((t) => t.id !== team.id));
    matches.update((prev) =>
      prev.map((m) => {
        const updated = { ...m };
        if (m.homeTeamId === team.id) {
          updated.homeTeamId = null;
          updated.homeTeam = null;
        }
        if (m.awayTeamId === team.id) {
          updated.awayTeamId = null;
          updated.awayTeam = null;
        }
        return updated;
      }),
    );

    return new Promise((resolve) => {
      this.teamService.removeTeam(workspaceId, team.id).subscribe({
        next: () => {
          this.uiService.success(`Team "${team.name}" deleted successfully.`);
          resolve(true);
        },
        error: (err) => {
          teams.set(originalTeams);
          matches.set(originalMatches);
          this.uiService.error(err.error?.message ?? 'Failed to delete team.');
          resolve(false);
        },
      });
    });
  }

  async deletePlayer(args: DeletePlayerArgs): Promise<boolean> {
    const { workspaceId, player, players } = args;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Player',
      message: `Delete player "${player.user.username}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return false;

    const originalPlayers = players();
    players.update((prev) => prev.filter((p) => p.id !== player.id));

    return new Promise((resolve) => {
      this.playerService.removePlayer(workspaceId, player.id).subscribe({
        next: () => {
          this.uiService.success(`Player "${player.user.username}" deleted successfully.`);
          resolve(true);
        },
        error: (err) => {
          players.set(originalPlayers);
          this.uiService.error(err.error?.message ?? 'Failed to delete player.');
          resolve(false);
        },
      });
    });
  }

  mergeSavedVenue(
    saved: Venue,
    venues: WritableSignal<Venue[]>,
    matches: WritableSignal<Match[]>,
  ): void {
    const isEdit = venues().some((v) => v.id === saved.id);
    if (isEdit) {
      venues.update((prev) => prev.map((v) => (v.id === saved.id ? saved : v)));
      matches.update((prev) =>
        prev.map((m) => (m.venueId === saved.id ? { ...m, venue: saved } : m)),
      );
    } else {
      venues.update((prev) => [...prev, saved]);
    }
  }

  mergeSavedPlayer(saved: Player, players: WritableSignal<Player[]>): void {
    const exists = players().some((p) => p.id === saved.id);
    if (exists) {
      players.update((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    } else {
      players.update((prev) => [...prev, saved]);
    }
  }

  mergeImportedPlayers(imported: Player[], players: WritableSignal<Player[]>): void {
    if (!imported?.length) return;
    players.update((prev) => {
      const list = [...prev];
      imported.forEach((p) => {
        if (!list.some((x) => x.id === p.id)) list.push(p);
      });
      return list;
    });
  }
}
