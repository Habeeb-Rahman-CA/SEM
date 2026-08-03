import { Pipe, PipeTransform } from '@angular/core';
import { Player } from '../../../../workspaces/services/workspace.service';

@Pipe({
  name: 'playerName',
  standalone: true,
})
export class PlayerNamePipe implements PipeTransform {
  transform(userId: string | undefined | null, players: Player[] | null | undefined): string {
    if (!userId) return '—';
    const list = players ?? [];
    const player = list.find((p) => p.userId === userId);
    return player ? (player.user?.username ?? userId) : userId;
  }
}
