import { Pipe, PipeTransform } from '@angular/core';

export interface RankBadge {
  icon?: string;
  circleClass?: string;
  text: string;
}

@Pipe({ name: 'rankMedal', standalone: true })
export class RankMedalPipe implements PipeTransform {
  transform(index: number): RankBadge {
    const rank = index + 1;
    switch (index) {
      case 0:
        return {
          circleClass:
            'inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[10px]',
          text: '1',
        };
      case 1:
        return {
          circleClass:
            'inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-300 text-slate-950 font-extrabold text-[10px]',
          text: '2',
        };
      case 2:
        return {
          circleClass:
            'inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-700 text-slate-950 font-extrabold text-[10px]',
          text: '3',
        };
      default:
        return { text: String(rank) };
    }
  }
}
