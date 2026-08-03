import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Competition, WorkspaceEvent } from '../../../workspaces/services/workspace.service';

@Component({
  selector: 'app-event-report-panel',
  standalone: true,
  imports: [DatePipe],
  template: `
    @if (!selectedEventId()) {
      <div
        class="py-8 text-center text-slate-500 text-xs font-bold border border-dashed border-white/5 rounded-xl"
      >
        Please select an Event Scope from filters above to preview this report.
      </div>
    } @else {
      <div class="space-y-6">
        <div class="bg-slate-950/40 p-4 border border-white/5 rounded-xl space-y-3">
          <h3 class="text-xs font-black text-blue-400 uppercase">Event Schedule Overview</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span class="text-slate-500 block text-[9px] uppercase font-bold"
                >Sport Category</span
              >
              <span class="text-white font-extrabold">{{
                selectedEvent()?.sport || 'General'
              }}</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[9px] uppercase font-bold">Start Date</span>
              <span class="text-white font-mono">{{
                selectedEvent()?.startDate | date: 'mediumDate'
              }}</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[9px] uppercase font-bold">End Date</span>
              <span class="text-white font-mono">{{
                selectedEvent()?.endDate | date: 'mediumDate'
              }}</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[9px] uppercase font-bold">Status</span>
              <span class="text-blue-400 font-extrabold capitalize">{{
                selectedEvent()?.status
              }}</span>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <h3 class="text-xs font-extrabold text-white flex items-center gap-2">
            <i class="fi fi-rr-trophy text-blue-400"></i> Competitions & Leagues
          </h3>
          <div class="overflow-x-auto border border-white/5 rounded-xl bg-slate-950/20">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  class="border-b border-white/5 text-[10px] uppercase font-bold text-slate-500 bg-slate-950/40"
                >
                  <th class="py-2.5 px-3">Competition Name</th>
                  <th class="py-2.5 px-3">Sport Type</th>
                  <th class="py-2.5 px-3">Status</th>
                  <th class="py-2.5 px-3">Created Date</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 text-slate-300">
                @for (c of competitions(); track c.id) {
                  <tr class="hover:bg-white/2 transition-colors">
                    <td class="py-2.5 px-3 font-bold text-white">{{ c.name }}</td>
                    <td class="py-2.5 px-3">{{ c.sport?.name || 'N/A' }}</td>
                    <td class="py-2.5 px-3 uppercase text-blue-400 font-bold">{{ c.status }}</td>
                    <td class="py-2.5 px-3">{{ c.createdAt | date: 'shortDate' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    }
  `,
})
export class EventReportPanel {
  events = input.required<WorkspaceEvent[]>();
  competitions = input.required<Competition[]>();
  selectedEventId = input.required<string>();

  selectedEvent = computed(() => this.events().find((e) => e.id === this.selectedEventId()));
}
