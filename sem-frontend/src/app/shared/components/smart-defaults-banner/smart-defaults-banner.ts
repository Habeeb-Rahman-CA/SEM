import { Component, input, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserPreferencesService } from '../../../core/services/user-preferences.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-smart-defaults-banner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './smart-defaults-banner.html',
})
export class SmartDefaultsBannerComponent {
  prefsService = inject(UserPreferencesService);
  ui = inject(UiService);

  formType = input<string>('event_creation');
  applyDefaults = output<Record<string, any>>();

  showSettingsModal = signal<boolean>(false);

  // Edit fields
  venueName = signal('');
  category = signal('');
  matchDuration = signal(90);
  organizerName = signal('');

  openSettings() {
    const prefs = this.prefsService.preferences();
    this.venueName.set(prefs.defaultVenueName || '');
    this.category.set(prefs.defaultCategory || '');
    this.matchDuration.set(prefs.defaultMatchDurationMins || 90);
    this.organizerName.set(prefs.defaultOrganizerName || '');
    this.showSettingsModal.set(true);
  }

  closeSettings() {
    this.showSettingsModal.set(false);
  }

  saveSettings() {
    this.prefsService.savePreferences({
      defaultVenueName: this.venueName(),
      defaultCategory: this.category(),
      defaultMatchDurationMins: Number(this.matchDuration()),
      defaultOrganizerName: this.organizerName(),
    });
    this.ui.success('✨ Smart defaults updated and saved to preferences!');
    this.closeSettings();

    // Trigger update for active form
    const defaults = this.prefsService.getSmartDefaultsForForm(this.formType());
    this.applyDefaults.emit(defaults);
  }

  onTriggerPrefill() {
    const defaults = this.prefsService.getSmartDefaultsForForm(this.formType());
    this.applyDefaults.emit(defaults);
    this.ui.info('✨ Applied intelligent defaults to empty form fields.');
  }
}
