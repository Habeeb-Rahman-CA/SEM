import type { Competition, WorkspaceEvent, WorkspaceMember } from '../services/workspace.service';
import type { Venue } from '../../venues/services/venue.service';
import {
  EMPTY_GLOBAL_SEARCH,
  GlobalSearchResults,
  ServerSearchResults,
} from '../models/workspace-tab.type';

export interface GlobalSearchInputs {
  query: string;
  events: WorkspaceEvent[];
  competitions: Competition[];
  venues: Venue[];
  members: WorkspaceMember[];
  serverResults: ServerSearchResults;
}

export function computeGlobalSearchResults(inputs: GlobalSearchInputs): GlobalSearchResults {
  const q = inputs.query.toLowerCase().trim();
  if (!q) return EMPTY_GLOBAL_SEARCH;

  const events = inputs.events.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.status.toLowerCase().includes(q) ||
      (e.description && e.description.toLowerCase().includes(q)),
  );

  const competitions = inputs.competitions.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.status.toLowerCase().includes(q) ||
      (c.sport?.name && c.sport.name.toLowerCase().includes(q)),
  );

  const venues = inputs.venues.filter(
    (v) => v.name.toLowerCase().includes(q) || (v.location && v.location.toLowerCase().includes(q)),
  );

  const members = inputs.members.filter(
    (m) => m.user.username.toLowerCase().includes(q) || m.role.name.toLowerCase().includes(q),
  );

  const { teams, players, files } = inputs.serverResults;
  const totalCount =
    teams.length +
    players.length +
    events.length +
    competitions.length +
    venues.length +
    members.length +
    files.length;

  return { teams, players, events, competitions, venues, members, files, totalCount };
}
