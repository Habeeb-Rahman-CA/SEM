import { Injectable, signal } from '@angular/core';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flagCode: string;
  isAvailable: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly STORAGE_KEY = 'sem_preferred_language';

  readonly languages: LanguageOption[] = [
    { code: 'en', name: 'English', nativeName: 'English (US)', flagCode: 'us', isAvailable: true },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flagCode: 'es', isAvailable: false },
    { code: 'fr', name: 'French', nativeName: 'Français', flagCode: 'fr', isAvailable: false },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flagCode: 'de', isAvailable: false },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flagCode: 'sa', isAvailable: false },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flagCode: 'in', isAvailable: false },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', flagCode: 'pt', isAvailable: false },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flagCode: 'jp', isAvailable: false },
    { code: 'zh', name: 'Chinese', nativeName: '中文', flagCode: 'cn', isAvailable: false },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', flagCode: 'it', isAvailable: false },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', flagCode: 'ru', isAvailable: false },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flagCode: 'tr', isAvailable: false },
  ];

  readonly currentLanguage = signal<LanguageOption>(this.languages[0]);

  constructor() {
    this.initSavedLanguage();
  }

  private initSavedLanguage(): void {
    try {
      const savedCode = localStorage.getItem(this.STORAGE_KEY);
      if (savedCode) {
        const found = this.languages.find((l) => l.code === savedCode && l.isAvailable);
        if (found) {
          this.currentLanguage.set(found);
          return;
        }
      }
    } catch {
      // localStorage fallback
    }
    this.currentLanguage.set(this.languages[0]);
  }

  setLanguage(lang: LanguageOption): boolean {
    if (lang.isAvailable) {
      this.currentLanguage.set(lang);
      try {
        localStorage.setItem(this.STORAGE_KEY, lang.code);
      } catch {
        // ignore storage error
      }
      return true;
    }
    return false;
  }
}
