export interface MasterFolderSeed {
  name: string;
  icon: string;
  color: string;
}

export const DEFAULT_WORKSPACE_FOLDERS_SEED: MasterFolderSeed[] = [
  {
    name: 'Match Reports 2026',
    icon: 'fi-rr-folder',
    color: 'text-violet-400 bg-violet-500/20',
  },
  {
    name: 'Tournament Media & Photos',
    icon: 'fi-rr-folder-image',
    color: 'text-emerald-400 bg-emerald-500/20',
  },
  {
    name: 'Tactical Playbooks & Specs',
    icon: 'fi-rr-folder-download',
    color: 'text-cyan-400 bg-cyan-500/20',
  },
  {
    name: 'Official Permits & Certificates',
    icon: 'fi-rr-folder-lock',
    color: 'text-amber-400 bg-amber-500/20',
  },
];
