import type {
  WorkspaceFile,
  Team,
  Player,
  WorkspaceEvent,
  Competition,
  WorkspaceMember,
} from '../services/workspace.service';
import type { Venue } from '../../venues/services/venue.service';

export type WorkspaceTab =
  | 'overview'
  | 'members'
  | 'settings'
  | 'teams'
  | 'players'
  | 'events'
  | 'venues'
  | 'reports'
  | 'files'
  | 'volunteers'
  | 'equipment'
  | 'medical'
  | 'accreditation'
  | 'streaming'
  | 'automation'
  | 'auctions'
  | 'transfers'
  | 'rosters'
  | 'finance'
  | 'governance'
  | 'chat'
  | 'direct-messages'
  | 'group-chats';

export interface ServerSearchResults {
  files: WorkspaceFile[];
  teams: Team[];
  players: Player[];
}

export interface GlobalSearchResults {
  teams: Team[];
  players: Player[];
  events: WorkspaceEvent[];
  competitions: Competition[];
  venues: Venue[];
  members: WorkspaceMember[];
  files: WorkspaceFile[];
  totalCount: number;
}

export const EMPTY_SERVER_SEARCH: ServerSearchResults = {
  files: [],
  teams: [],
  players: [],
};

export const EMPTY_GLOBAL_SEARCH: GlobalSearchResults = {
  teams: [],
  players: [],
  events: [],
  competitions: [],
  venues: [],
  members: [],
  files: [],
  totalCount: 0,
};
