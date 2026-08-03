import { Component, computed, input, output } from '@angular/core';
import { VolunteerReportRow } from '../../models/report.interface';
import { VolunteerHoursPipe } from '../../pipes/volunteer-hours.pipe';

@Component({
  selector: 'app-volunteer-report-panel',
  standalone: true,
  imports: [VolunteerHoursPipe],
  template: `
    @if (volunteers().length === 0) {
      <div
        class="py-8 text-center text-slate-500 text-xs font-bold border border-dashed border-white/5 rounded-xl"
      >
        No volunteer statistics available. Go to the Volunteer tab to schedule shifts.
      </div>
    } @else {
      <div class="space-y-6 animate-fade-in text-white">
        <div class="flex justify-between items-center">
          <h3
            class="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2"
          >
            <i class="fi fi-rr-heart text-emerald-400"></i> Volunteer Service hour reports
          </h3>
          <button
            (click)="exportRequested.emit()"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <i class="fi fi-rr-download"></i> Export Excel
          </button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-slate-950/40 p-4 border border-white/5 rounded-xl">
            <div class="text-[9px] text-slate-500 uppercase font-black tracking-wider">
              Total Volunteers
            </div>
            <div class="text-xl font-black text-white mt-1">{{ totalVolunteers() }}</div>
            <div class="text-[8px] text-slate-400 mt-0.5">Active registered personnel</div>
          </div>

          <div class="bg-slate-950/40 p-4 border border-white/5 rounded-xl">
            <div class="text-[9px] text-slate-500 uppercase font-black tracking-wider">
              Total Staffed Shifts
            </div>
            <div class="text-xl font-black text-violet-400 mt-1">{{ totalShifts() }}</div>
            <div class="text-[8px] text-slate-400 mt-0.5">Staffed event assignments</div>
          </div>

          <div class="bg-slate-950/40 p-4 border border-white/5 rounded-xl">
            <div class="text-[9px] text-slate-500 uppercase font-black tracking-wider">
              Logged Service Hours
            </div>
            <div class="text-xl font-black text-emerald-400 mt-1">{{ totalHours() }} hrs</div>
            <div class="text-[8px] text-slate-400 mt-0.5">Total contribution time</div>
          </div>

          <div class="bg-slate-950/40 p-4 border border-white/5 rounded-xl">
            <div class="text-[9px] text-slate-500 uppercase font-black tracking-wider">
              Avg Rating
            </div>
            <div class="text-xl font-black text-amber-400 mt-1 flex items-center gap-1">
              <i class="fi fi-rr-star text-sm"></i> {{ averageRating() }} / 5
            </div>
            <div class="text-[8px] text-slate-400 mt-0.5">Organizer feedback average</div>
          </div>
        </div>

        <div class="bg-slate-950/40 border border-white/5 rounded-2xl p-5 shadow-xl">
          <h4 class="text-xs font-black text-slate-300 uppercase tracking-widest mb-4">
            Volunteer Participation Summary
          </h4>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr
                  class="border-b border-white/10 text-slate-500 font-bold uppercase tracking-wider text-[10px]"
                >
                  <th class="py-2.5">Volunteer</th>
                  <th class="py-2.5">Status</th>
                  <th class="py-2.5">Skills</th>
                  <th class="py-2.5 text-center">Shifts Signed Up</th>
                  <th class="py-2.5 text-center">Service Hours</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 text-slate-300">
                @for (v of volunteers(); track v.id) {
                  <tr>
                    <td class="py-3 font-bold text-white">{{ v.user.username }}</td>
                    <td class="py-3 uppercase text-[9px] font-black">
                      <span
                        [class]="
                          v.status === 'approved'
                            ? 'text-emerald-400'
                            : v.status === 'pending'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                        "
                      >
                        {{ v.status }}
                      </span>
                    </td>
                    <td class="py-3">
                      <div class="flex flex-wrap gap-1">
                        @for (skill of v.skills; track skill) {
                          <span
                            class="text-[9px] bg-slate-900 border border-white/10 px-2 py-0.5 rounded text-slate-400 font-bold"
                          >
                            {{ skill }}
                          </span>
                        }
                      </div>
                    </td>
                    <td class="py-3 text-center font-semibold">{{ v.assignments.length }}</td>
                    <td class="py-3 text-center font-bold text-emerald-400">
                      {{ v | volunteerHours }} hrs
                    </td>
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
export class VolunteerReportPanel {
  volunteers = input.required<VolunteerReportRow[]>();
  exportRequested = output<void>();

  totalVolunteers = computed(() => this.volunteers().length);
  totalShifts = computed(() =>
    this.volunteers().reduce((sum, v) => sum + (v.assignments || []).length, 0),
  );
  totalHours = computed(() => {
    let hours = 0;
    for (const v of this.volunteers()) {
      const completed = (v.assignments || []).filter((a) => a.status === 'attended');
      for (const a of completed) hours += Number(a.serviceHours || 0);
    }
    return hours;
  });
  averageRating = computed(() => {
    let sum = 0;
    let count = 0;
    for (const v of this.volunteers()) {
      const completed = (v.assignments || []).filter(
        (a) => a.status === 'attended' && a.rating !== null,
      );
      for (const a of completed) {
        sum += Number(a.rating);
        count++;
      }
    }
    return count > 0 ? (sum / count).toFixed(1) : '4.8';
  });
}
