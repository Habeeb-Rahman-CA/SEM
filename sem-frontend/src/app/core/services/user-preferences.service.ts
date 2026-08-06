import { Injectable, signal } from '@angular/core';

export interface UserPreferences {
  defaultVenueId?: string;
  defaultVenueName?: string;
  defaultCategory?: string;
  defaultSport?: string;
  defaultCurrency?: string;
  defaultMatchDurationMins?: number;
  defaultMaxTeams?: number;
  defaultPrimaryColor?: string;
  defaultOrganizerName?: string;
  defaultTimezone?: string;
}

export interface FieldFrequency {
  value: any;
  count: number;
  lastUsedAt: number;
}

const PREFERENCES_STORAGE_KEY = 'taisen_user_preferences_v1';
const RECENT_CHOICES_STORAGE_KEY = 'taisen_recent_form_choices_v1';

@Injectable({
  providedIn: 'root',
})
export class UserPreferencesService {
  preferences = signal<UserPreferences>(this.loadPreferences());
  recentHistory = signal<Record<string, Record<string, FieldFrequency>>>(this.loadRecentHistory());

  private loadPreferences(): UserPreferences {
    try {
      const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // Fallback
    }

    // Curated intelligent defaults
    return {
      defaultVenueName: 'Taisen Arena - Central Ground',
      defaultCategory: 'Football 11v11',
      defaultSport: 'Football',
      defaultCurrency: 'USD',
      defaultMatchDurationMins: 90,
      defaultMaxTeams: 16,
      defaultPrimaryColor: '#6366f1',
      defaultOrganizerName: 'Taisen Sports League Admin',
      defaultTimezone: 'UTC+3 (Gulf Standard Time)',
    };
  }

  private loadRecentHistory(): Record<string, Record<string, FieldFrequency>> {
    try {
      const raw = localStorage.getItem(RECENT_CHOICES_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // Fallback
    }
    return {};
  }

  savePreferences(prefs: Partial<UserPreferences>) {
    const updated = { ...this.preferences(), ...prefs };
    this.preferences.set(updated);
    try {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist user preferences:', e);
    }
  }

  /**
   * Tracks a field choice made by the user in a form (e.g. event_creation -> venueId = 'v-101')
   */
  rememberChoice(formType: string, field: string, value: any) {
    if (!value || typeof value === 'object') return;

    const history = this.recentHistory();
    if (!history[formType]) history[formType] = {};

    const existing = history[formType][field] || { value, count: 0, lastUsedAt: Date.now() };
    history[formType][field] = {
      value,
      count: (existing.value === value ? existing.count : 0) + 1,
      lastUsedAt: Date.now(),
    };

    this.recentHistory.set({ ...history });
    try {
      localStorage.setItem(RECENT_CHOICES_STORAGE_KEY, JSON.stringify(history));
    } catch (e) {}
  }

  /**
   * Returns intelligent defaults for a given form type based on preferences and history
   */
  getSmartDefaultsForForm(formType: string): Record<string, any> {
    const prefs = this.preferences();
    const history = this.recentHistory()[formType] || {};

    const defaults: Record<string, any> = {};

    switch (formType) {
      case 'event_creation':
        defaults['category'] = history['category']?.value || prefs.defaultCategory;
        defaults['sport'] = history['sport']?.value || prefs.defaultSport;
        defaults['venueName'] = history['venueName']?.value || prefs.defaultVenueName;
        defaults['maxTeams'] = history['maxTeams']?.value || prefs.defaultMaxTeams;
        defaults['matchDuration'] =
          history['matchDuration']?.value || prefs.defaultMatchDurationMins;
        defaults['organizerName'] = prefs.defaultOrganizerName;
        defaults['timezone'] = prefs.defaultTimezone;
        break;

      case 'team_registration':
        defaults['category'] = history['category']?.value || prefs.defaultCategory;
        defaults['primaryColor'] = history['primaryColor']?.value || prefs.defaultPrimaryColor;
        defaults['maxRoster'] = 22;
        defaults['homeGround'] = prefs.defaultVenueName;
        break;

      case 'player_registration':
        defaults['nationality'] = history['nationality']?.value || 'United Arab Emirates';
        defaults['position'] = history['position']?.value || 'Midfielder';
        defaults['medicalCleared'] = true;
        break;

      default:
        defaults['organizer'] = prefs.defaultOrganizerName;
        defaults['currency'] = prefs.defaultCurrency;
        break;
    }

    return defaults;
  }

  /**
   * Automatically pre-fills empty form fields with smart defaults
   */
  applySmartDefaults(formType: string, currentData: Record<string, any>): Record<string, any> {
    const defaults = this.getSmartDefaultsForForm(formType);
    const result = { ...currentData };

    for (const key of Object.keys(defaults)) {
      if (result[key] === undefined || result[key] === null || result[key] === '') {
        result[key] = defaults[key];
      }
    }

    return result;
  }
}
