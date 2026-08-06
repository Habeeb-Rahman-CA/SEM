import { Component, input, AfterViewInit, ElementRef, OnDestroy, viewChild } from '@angular/core';
import tippy, { Instance } from 'tippy.js';

export type HelpTooltipPosition = 'top' | 'bottom' | 'left' | 'right';

@Component({
  selector: 'app-help-tooltip',
  standalone: true,
  template: `
    <button
      #btn
      type="button"
      class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-700 hover:bg-violet-600 border border-white/15 hover:border-violet-400 text-slate-400 hover:text-white transition-all duration-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500 shrink-0 align-middle ml-0.5"
      aria-label="Help"
    >
      <i class="fi fi-rr-info" style="font-size: 8px; line-height: 1;"></i>
    </button>
  `,
})
export class HelpTooltipComponent implements AfterViewInit, OnDestroy {
  text = input.required<string>();
  position = input<HelpTooltipPosition>('top');

  btnRef = viewChild.required<ElementRef<HTMLButtonElement>>('btn');
  private tippyInstance?: Instance;

  ngAfterViewInit() {
    this.tippyInstance = tippy(this.btnRef().nativeElement, {
      content: this.text(),
      placement: this.position(),
      theme: 'taisen',
      arrow: true,
      animation: 'shift-away',
      duration: [150, 120],
      maxWidth: 280,
      appendTo: document.body,
      interactive: false,
    }) as unknown as Instance;
  }

  ngOnDestroy() {
    this.tippyInstance?.destroy();
  }
}
