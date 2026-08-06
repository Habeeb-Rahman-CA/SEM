import { Directive, ElementRef, input, OnInit, OnDestroy, OnChanges } from '@angular/core';
import tippy, { Instance } from 'tippy.js';

@Directive({
  selector: '[appTippy]',
  standalone: true,
})
export class TippyDirective implements OnInit, OnDestroy, OnChanges {
  appTippy = input.required<string>();
  tippyPlacement = input<string>('top');
  tippyTheme = input<string>('taisen');
  tippyArrow = input<boolean>(true);

  private instance?: Instance;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit() {
    this.init();
  }

  ngOnChanges() {
    if (this.instance) {
      this.instance.setContent(this.appTippy());
    }
  }

  private init() {
    this.instance = tippy(this.el.nativeElement, {
      content: this.appTippy(),
      placement: this.tippyPlacement() as any,
      arrow: this.tippyArrow(),
      theme: this.tippyTheme(),
      animation: 'shift-away',
      duration: [150, 120],
      maxWidth: 260,
      interactive: false,
      appendTo: document.body,
    }) as unknown as Instance;
  }

  ngOnDestroy() {
    this.instance?.destroy();
  }
}
