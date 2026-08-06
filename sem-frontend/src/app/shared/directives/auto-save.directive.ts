import {
  Directive,
  Input,
  OnInit,
  OnDestroy,
  inject,
  HostListener,
  Output,
  EventEmitter,
  effect,
} from '@angular/core';
import { NgForm, FormGroupDirective } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AutoSaveService, DraftItem } from '../../core/services/auto-save.service';

@Directive({
  selector: '[appAutoSave]',
  standalone: true,
})
export class AutoSaveDirective implements OnInit, OnDestroy {
  private autoSaveService = inject(AutoSaveService);
  private ngForm = inject(NgForm, { optional: true });
  private formGroup = inject(FormGroupDirective, { optional: true });

  @Input() appAutoSave: string = 'general_form'; // formType slug e.g. 'event_creation'
  @Input() formTitle: string = 'Form Draft';
  @Input() workspaceId: string = 'default-ws';

  @Output() draftRestored = new EventEmitter<Record<string, any>>();

  private sub?: Subscription;

  constructor() {
    // Listen for draft restoration events
    effect(() => {
      const restored = this.autoSaveService.restoredDraft();
      if (restored && (restored.formType === this.appAutoSave || !restored.formType)) {
        this.draftRestored.emit(restored.formData);
      }
    });
  }

  ngOnInit() {
    const form = this.ngForm?.form || this.formGroup?.form;
    if (form) {
      this.sub = form.valueChanges.subscribe((values) => {
        if (form.dirty || form.touched) {
          this.autoSaveService.triggerAutoSave(
            this.formTitle,
            this.appAutoSave,
            values,
            undefined,
            this.workspaceId,
          );
        }
      });
    }
  }

  @HostListener('input')
  onInput() {
    if (!this.ngForm && !this.formGroup) {
      // Fallback for non-reactive forms
      const values = this.extractFormValues();
      this.autoSaveService.triggerAutoSave(
        this.formTitle,
        this.appAutoSave,
        values,
        undefined,
        this.workspaceId,
      );
    }
  }

  private extractFormValues(): Record<string, any> {
    const formEl = document.querySelector('form');
    if (!formEl) return {};
    const formData = new FormData(formEl);
    const result: Record<string, any> = {};
    formData.forEach((val, key) => {
      result[key] = val;
    });
    return result;
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
