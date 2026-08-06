import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MomentumInterval {
  label: string;
  startMin: number;
  endMin: number;
  homeDominance: number; // 0 - 100
  awayDominance: number; // 0 - 100
  homePoints: number;
  awayPoints: number;
  eventsCount: number;
  dominantSide: 'home' | 'away' | 'even';
  highlightText?: string;
}

export interface MomentumSummary {
  homePercentage: number;
  awayPercentage: number;
  homeBlocks: string; // ASCII blocks for Home (e.g. ████████░░░░░)
  awayBlocks: string; // ASCII blocks for Away (e.g. ░░░░█████████)
  intervals: MomentumInterval[];
  dominantTeamName: string;
  dominantSide: 'home' | 'away' | 'even';
  peakInterval?: MomentumInterval;
  summaryText: string;
}

@Component({
  selector: 'app-momentum-graph',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './momentum-graph.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MomentumGraphComponent {
  liveData = input<any>(null);
  homeTeamName = input<string>('Home');
  awayTeamName = input<string>('Away');
  homeScore = input<number>(0);
  awayScore = input<number>(0);
  sportCode = input<string>('football');
  status = input<string>('completed');
  homeLogoUrl = input<string | null>(null);
  awayLogoUrl = input<string | null>(null);

  selectedInterval = signal<MomentumInterval | null>(null);

  summary = computed<MomentumSummary>(() => {
    const live = this.liveData() || {};
    const hName = this.homeTeamName() || 'Home';
    const aName = this.awayTeamName() || 'Away';
    const hScore = this.homeScore() || 0;
    const aScore = this.awayScore() || 0;
    const sport = (this.sportCode() || 'football').toLowerCase();

    // Check if liveData explicitly provides momentum
    if (Array.isArray(live.momentum) && live.momentum.length > 0) {
      return this.buildFromCustomMomentum(live.momentum, hName, aName);
    }

    // Build dynamically from match events/score breakdown
    return this.calculateDynamicMomentum(live, hName, aName, hScore, aScore, sport);
  });

  selectInterval(interval: MomentumInterval) {
    if (this.selectedInterval()?.label === interval.label) {
      this.selectedInterval.set(null);
    } else {
      this.selectedInterval.set(interval);
    }
  }

  private calculateDynamicMomentum(
    live: any,
    hName: string,
    aName: string,
    hScore: number,
    aScore: number,
    sport: string,
  ): MomentumSummary {
    const rawEvents: any[] = Array.isArray(live.events) ? live.events : [];
    const intervalCount = 6; // 6 segments across match
    const intervals: MomentumInterval[] = [];

    // Determine total duration or max minute
    let maxMin = 90;
    if (sport === 'basketball') maxMin = 48;
    else if (sport === 'cricket')
      maxMin = 20; // 20 overs
    else if (sport === 'badminton' || sport === 'volleyball' || sport === 'table-tennis')
      maxMin = 3; // 3 sets

    const segmentDuration = Math.ceil(maxMin / intervalCount);

    let totalHomePoints = 0;
    let totalAwayPoints = 0;

    for (let i = 0; i < intervalCount; i++) {
      const startMin = i * segmentDuration;
      const endMin = (i + 1) * segmentDuration;
      const label =
        sport === 'cricket'
          ? `Ov ${startMin + 1}-${endMin}`
          : sport === 'badminton' || sport === 'volleyball' || sport === 'table-tennis'
            ? `Set ${i + 1}`
            : `${startMin}'-${endMin}'`;

      let hPoints = 5; // Base baseline
      let aPoints = 5;
      let count = 0;
      const intervalEvents: string[] = [];

      for (const ev of rawEvents) {
        const min = ev.minute ?? ev.min ?? ev.over ?? null;
        let inSegment = false;

        if (typeof min === 'number') {
          inSegment = min >= startMin && min < endMin;
        } else if (typeof min === 'string' && sport === 'cricket') {
          const overNum = parseFloat(min);
          inSegment = !isNaN(overNum) && overNum >= startMin && overNum < endMin;
        }

        if (inSegment) {
          count++;
          const isHome = ev.teamSide === 'home' || ev.teamId === live.homeTeamId;
          const weight = this.getEventWeight(ev.type || ev.kind);

          if (isHome) {
            hPoints += weight;
            if (ev.playerName) intervalEvents.push(`${ev.type || 'Event'} by ${ev.playerName}`);
          } else {
            aPoints += weight;
            if (ev.playerName) intervalEvents.push(`${ev.type || 'Event'} by ${ev.playerName}`);
          }
        }
      }

      // Add score weighting proportional to score if events are sparse
      if (rawEvents.length === 0) {
        if (hScore > aScore) {
          hPoints += Math.min(25, hScore * 6 + (i % 2 === 0 ? 4 : 2));
          aPoints += Math.max(2, aScore * 4);
        } else if (aScore > hScore) {
          aPoints += Math.min(25, aScore * 6 + (i % 2 === 1 ? 4 : 2));
          hPoints += Math.max(2, hScore * 4);
        } else {
          hPoints += 6 + (i % 3);
          aPoints += 6 + ((i + 1) % 3);
        }
      }

      const segTotal = hPoints + aPoints || 1;
      const homeDominance = Math.round((hPoints / segTotal) * 100);
      const awayDominance = 100 - homeDominance;
      const dominantSide: 'home' | 'away' | 'even' =
        homeDominance > 55 ? 'home' : awayDominance > 55 ? 'away' : 'even';

      totalHomePoints += hPoints;
      totalAwayPoints += aPoints;

      intervals.push({
        label,
        startMin,
        endMin,
        homeDominance,
        awayDominance,
        homePoints: hPoints,
        awayPoints: aPoints,
        eventsCount: count,
        dominantSide,
        highlightText: intervalEvents.length > 0 ? intervalEvents.join(' · ') : undefined,
      });
    }

    const grandTotal = totalHomePoints + totalAwayPoints || 1;
    const homePercentage = Math.min(
      95,
      Math.max(5, Math.round((totalHomePoints / grandTotal) * 100)),
    );
    const awayPercentage = 100 - homePercentage;

    // Generate ASCII block strings (12 characters wide)
    const blockCount = 12;
    const homeFilledCount = Math.round((homePercentage / 100) * blockCount);
    const awayFilledCount = Math.round((awayPercentage / 100) * blockCount);

    const homeBlocks = '█'.repeat(homeFilledCount) + '░'.repeat(blockCount - homeFilledCount);
    const awayBlocks = '░'.repeat(blockCount - awayFilledCount) + '█'.repeat(awayFilledCount);

    const dominantSide: 'home' | 'away' | 'even' =
      homePercentage > 54 ? 'home' : awayPercentage > 54 ? 'away' : 'even';

    const dominantTeamName =
      dominantSide === 'home' ? hName : dominantSide === 'away' ? aName : 'Neither';

    // Find peak interval
    let peakInterval = intervals[0];
    let maxDominanceDiff = -1;
    for (const inv of intervals) {
      const diff = Math.abs(inv.homeDominance - inv.awayDominance);
      if (diff > maxDominanceDiff) {
        maxDominanceDiff = diff;
        peakInterval = inv;
      }
    }

    let summaryText = '';
    if (dominantSide === 'home') {
      summaryText = `${hName} controlled ${homePercentage}% of total match momentum, peaking during ${peakInterval.label}.`;
    } else if (dominantSide === 'away') {
      summaryText = `${aName} dominated ${awayPercentage}% of total match momentum, peaking during ${peakInterval.label}.`;
    } else {
      summaryText = `An evenly balanced match with momentum shifting back and forth between ${hName} and ${aName}.`;
    }

    return {
      homePercentage,
      awayPercentage,
      homeBlocks,
      awayBlocks,
      intervals,
      dominantTeamName,
      dominantSide,
      peakInterval,
      summaryText,
    };
  }

  private buildFromCustomMomentum(
    momentumList: any[],
    hName: string,
    aName: string,
  ): MomentumSummary {
    let totalHome = 0;
    let totalAway = 0;
    const intervals: MomentumInterval[] = [];

    momentumList.forEach((m, idx) => {
      const homeDom = m.home ?? 50;
      const awayDom = m.away ?? 100 - homeDom;
      totalHome += homeDom;
      totalAway += awayDom;

      intervals.push({
        label: m.label || `P${idx + 1}`,
        startMin: idx * 15,
        endMin: (idx + 1) * 15,
        homeDominance: homeDom,
        awayDominance: awayDom,
        homePoints: homeDom,
        awayPoints: awayDom,
        eventsCount: m.eventsCount || 0,
        dominantSide: homeDom > 55 ? 'home' : awayDom > 55 ? 'away' : 'even',
        highlightText: m.note,
      });
    });

    const grandTotal = totalHome + totalAway || 1;
    const homePercentage = Math.round((totalHome / grandTotal) * 100);
    const awayPercentage = 100 - homePercentage;

    const blockCount = 12;
    const homeFilledCount = Math.round((homePercentage / 100) * blockCount);
    const awayFilledCount = Math.round((awayPercentage / 100) * blockCount);

    const homeBlocks = '█'.repeat(homeFilledCount) + '░'.repeat(blockCount - homeFilledCount);
    const awayBlocks = '░'.repeat(blockCount - awayFilledCount) + '█'.repeat(awayFilledCount);

    const dominantSide: 'home' | 'away' | 'even' =
      homePercentage > 54 ? 'home' : awayPercentage > 54 ? 'away' : 'even';

    return {
      homePercentage,
      awayPercentage,
      homeBlocks,
      awayBlocks,
      intervals,
      dominantTeamName:
        dominantSide === 'home' ? hName : dominantSide === 'away' ? aName : 'Neither',
      dominantSide,
      summaryText: `${dominantSide === 'home' ? hName : dominantSide === 'away' ? aName : 'Both teams'} maintained consistent momentum throughout the match.`,
    };
  }

  private getEventWeight(eventType: string): number {
    switch (eventType) {
      case 'goal':
      case 'try':
      case 'three_pointer':
      case 'six':
        return 25;
      case 'shot':
      case 'corner':
      case 'four':
      case 'rallies':
      case 'wicket':
        return 12;
      case 'yellow_card':
      case 'foul':
        return -5;
      case 'red_card':
        return -20;
      case 'assist':
      case 'substitution':
      case 'sub':
        return 8;
      default:
        return 6;
    }
  }
}
