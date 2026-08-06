import { Injectable, signal, computed } from '@angular/core';

export interface SmartSuggestion {
  id: string;
  title: string;
  message: string;
  icon: string;
  actionText?: string;
  onAction?: () => void;
  duration?: number; // Defaults to 5000ms (5 sec)
}

@Injectable({
  providedIn: 'root',
})
export class SmartSuggestionsService {
  private activeSuggestionsSignal = signal<SmartSuggestion[]>([]);
  suggestions = computed(() => this.activeSuggestionsSignal());

  showSuggestion(
    message: string,
    title = 'Smart Suggestion',
    icon = 'fi fi-rr-sparkles text-amber-400',
    actionText?: string,
    onAction?: () => void,
    duration = 5000,
  ): string {
    const id = 'suggestion_' + Math.random().toString(36).substring(2, 9);
    const item: SmartSuggestion = {
      id,
      title,
      message,
      icon,
      actionText,
      onAction,
      duration,
    };

    this.activeSuggestionsSignal.update((prev) => [...prev, item]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      this.dismissSuggestion(id);
    }, duration);

    return id;
  }

  dismissSuggestion(id: string) {
    this.activeSuggestionsSignal.update((prev) => prev.filter((s) => s.id !== id));
  }

  // Pre-configured Smart Suggestion triggers for common scenarios
  suggestScheduleHint() {
    this.showSuggestion(
      'You usually schedule football matches on Saturdays at 4:00 PM.',
      'Scheduling Pattern Detected',
      'fi fi-rr-calendar-clock text-amber-400',
      'Auto-Fill Saturday 4 PM',
      () => console.log('Applied Saturday schedule suggestion'),
    );
  }

  suggestTeamFatigueWarning(teamName: string) {
    this.showSuggestion(
      `" ${teamName}" has already played a match today. Consider scheduling back-to-back rest hours.`,
      'Team Match Alert',
      'fi fi-rr-time-fast text-rose-400',
    );
  }

  suggestRosterMilestone(teamName: string) {
    this.showSuggestion(
      `"${teamName}" is 1 player away from unlocking the "Full Roster Master" achievement!`,
      'Roster Tip',
      'fi fi-sr-trophy text-amber-400',
    );
  }
}
