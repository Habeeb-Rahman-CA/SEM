import { Pipe, PipeTransform } from '@angular/core';

const CLASS_MAP: Record<string, string> = {
  ongoing:
    'text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20',
  completed:
    'text-[10px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20',
  cancelled:
    'text-[10px] font-bold px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded-md border border-rose-500/20',
  upcoming:
    'text-[10px] font-bold px-2 py-0.5 bg-slate-500/10 text-slate-400 rounded-md border border-slate-500/20',
};

const LABEL_MAP: Record<string, string> = {
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
  upcoming: 'Upcoming',
};

@Pipe({ name: 'competitionStatusBadge', standalone: true })
export class CompetitionStatusBadgePipe implements PipeTransform {
  transform(status: string | null | undefined): { class: string; label: string } {
    const key = (status ?? '').toLowerCase();
    return {
      class: CLASS_MAP[key] ?? CLASS_MAP['upcoming'],
      label: LABEL_MAP[key] ?? 'Upcoming',
    };
  }
}
