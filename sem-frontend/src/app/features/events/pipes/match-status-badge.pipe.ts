import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'matchStatusBadge', standalone: true })
export class MatchStatusBadgePipe implements PipeTransform {
  transform(status: string | null | undefined): { class: string; label: string } {
    switch ((status ?? '').toLowerCase()) {
      case 'live':
        return {
          class:
            'text-[10px] font-bold px-2.5 py-1 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20 uppercase tracking-wider animate-pulse',
          label: 'LIVE',
        };
      case 'completed':
        return {
          class:
            'text-[10px] font-bold px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 uppercase tracking-wider',
          label: 'Completed',
        };
      default:
        return {
          class:
            'text-[10px] font-bold px-2.5 py-1 bg-slate-800 text-slate-400 rounded-lg border border-white/5 uppercase tracking-wider',
          label: 'Scheduled',
        };
    }
  }
}
