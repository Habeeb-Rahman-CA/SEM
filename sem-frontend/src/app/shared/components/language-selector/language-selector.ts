import { Component, ElementRef, HostListener, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageOption, LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-block text-left" #dropdownRef>
      <!-- Trigger Button -->
      <button
        type="button"
        (click)="toggleDropdown($event)"
        class="inline-flex items-center gap-2 text-xs font-medium text-slate-200 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-white/15 px-3 py-1.5 rounded-xl transition shadow-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-violet-500/50 cursor-pointer"
        aria-haspopup="true"
        [attr.aria-expanded]="isOpen()"
      >
        <span
          class="w-5 h-5 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0"
        >
          <i class="fi fi-rr-globe text-[11px] text-violet-400"></i>
        </span>
        <span class="font-semibold text-slate-100 tracking-wide">{{
          selectedLanguage().name
        }}</span>
        <span
          class="text-[10px] uppercase font-extrabold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20"
        >
          {{ selectedLanguage().code }}
        </span>
        <i
          class="fi fi-rr-angle-small-down text-[10px] text-slate-400 transition-transform duration-200 shrink-0"
          [class.rotate-180]="isOpen()"
        ></i>
      </button>

      <!-- Dropdown Menu Popover -->
      @if (isOpen()) {
        <div
          class="absolute w-72 rounded-2xl bg-slate-900/95 border border-white/15 shadow-2xl p-3 z-50 text-left backdrop-blur-xl transition-all duration-200"
          [class.bottom-full]="direction() === 'up'"
          [class.mb-2]="direction() === 'up'"
          [class.top-full]="direction() === 'down'"
          [class.mt-2]="direction() === 'down'"
          [class.right-0]="align() === 'right'"
          [class.left-0]="align() === 'left'"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="px-2.5 py-2 border-b border-white/10 mb-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="fi fi-rr-globe text-xs text-violet-400"></i>
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-300"
                >Select Language</span
              >
            </div>
            <span
              class="text-[9px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Active
            </span>
          </div>

          <!-- Active Language Indicator -->
          <div
            class="mx-0.5 mb-2 px-3 py-2 rounded-xl bg-violet-950/40 border border-violet-500/20 flex items-center justify-between text-xs"
          >
            <span class="text-slate-400 font-medium">Selected Locale:</span>
            <span class="font-bold text-violet-300 flex items-center gap-1.5">
              <i class="fi fi-rr-check-circle text-xs text-emerald-400"></i>
              {{ selectedLanguage().nativeName }}
            </span>
          </div>

          <!-- Language Options List -->
          <div class="space-y-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            @for (lang of languages; track lang.code) {
              <button
                type="button"
                (click)="selectLanguage(lang)"
                class="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer text-left border"
                [class]="
                  lang.code === selectedLanguage().code
                    ? 'bg-violet-600/30 text-white border-violet-500/50 shadow-sm shadow-violet-500/20'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white bg-slate-800/30 border-transparent'
                "
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span class="font-bold text-slate-100">{{ lang.name }}</span>
                  <span class="text-[10px] text-slate-400 truncate">({{ lang.nativeName }})</span>
                </div>

                @if (lang.isAvailable) {
                  <span
                    class="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"
                  >
                    <i class="fi fi-rr-check text-[10px]"></i>
                    Supported
                  </span>
                } @else {
                  <span
                    class="text-[9px] font-extrabold uppercase tracking-wider text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30 shrink-0 shadow-sm"
                  >
                    Coming Soon
                  </span>
                }
              </button>
            }
          </div>

          <!-- Notice Banner for non-supported languages -->
          @if (noticeMessage()) {
            <div
              class="mt-2.5 p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-200 text-[11px] flex items-start justify-between gap-2 animate-fadeIn"
            >
              <div class="flex items-start gap-2">
                <i class="fi fi-rr-info text-xs text-amber-400 shrink-0 mt-0.5"></i>
                <span class="leading-tight">{{ noticeMessage() }}</span>
              </div>
              <button
                type="button"
                (click)="dismissNotice($event)"
                class="text-amber-400 hover:text-white p-0.5 shrink-0"
                aria-label="Dismiss notice"
              >
                <i class="fi fi-rr-cross-small text-xs"></i>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class LanguageSelectorComponent {
  direction = input<'up' | 'down'>('up');
  align = input<'left' | 'right'>('right');

  private languageService = inject(LanguageService);
  private elRef = inject(ElementRef);

  isOpen = signal<boolean>(false);
  noticeMessage = signal<string | null>(null);

  languages = this.languageService.languages;
  selectedLanguage = this.languageService.currentLanguage;

  toggleDropdown(e: Event) {
    e.stopPropagation();
    this.isOpen.update((v) => !v);
    this.noticeMessage.set(null);
  }

  selectLanguage(lang: LanguageOption) {
    if (lang.isAvailable) {
      this.languageService.setLanguage(lang);
      this.isOpen.set(false);
      this.noticeMessage.set(null);
    } else {
      this.noticeMessage.set(
        `${lang.name} (${lang.nativeName}) localization is coming soon! Currently English (US) is the default supported language.`,
      );
    }
  }

  dismissNotice(e: Event) {
    e.stopPropagation();
    this.noticeMessage.set(null);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.isOpen() && !this.elRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
      this.noticeMessage.set(null);
    }
  }
}
