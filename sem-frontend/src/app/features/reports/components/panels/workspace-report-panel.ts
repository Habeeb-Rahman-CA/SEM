import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Role, Team, Workspace } from '../../../workspaces/services/workspace.service';

@Component({
  selector: 'app-workspace-report-panel',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-slate-950/40 p-4 border border-white/5 rounded-xl space-y-2">
          <h3 class="text-xs font-black text-violet-400 uppercase">Workspace Metadata</h3>
          <div class="text-xs text-slate-300"><b>Workspace Name:</b> {{ workspace()?.name }}</div>
          <div class="text-xs text-slate-300"><b>Workspace Slug:</b> {{ workspace()?.slug }}</div>
          <div class="text-xs text-slate-300"><b>Role Count:</b> {{ roles().length }} roles</div>
        </div>
        <div class="bg-slate-950/40 p-4 border border-white/5 rounded-xl space-y-2">
          <h3 class="text-xs font-black text-violet-400 uppercase">Workspace Roles Summary</h3>
          <div class="divide-y divide-white/5">
            @for (r of roles(); track r.id) {
              <div class="text-[11px] text-slate-400 py-1 flex justify-between">
                <span>{{ r.name }}</span>
                <span class="font-mono text-slate-500">{{ r.permissions?.length || 0 }} perms</span>
              </div>
            }
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <h3 class="text-xs font-extrabold text-white flex items-center gap-2">
          <i class="fi fi-rr-users text-violet-400"></i> Registered Teams
        </h3>
        <div class="overflow-x-auto border border-white/5 rounded-xl bg-slate-950/20">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr
                class="border-b border-white/5 text-[10px] uppercase font-bold text-slate-500 bg-slate-950/40"
              >
                <th class="py-2.5 px-3">Team Name</th>
                <th class="py-2.5 px-3">Code</th>
                <th class="py-2.5 px-3">Description</th>
                <th class="py-2.5 px-3">Created Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 text-slate-300">
              @for (t of teams(); track t.id) {
                <tr class="hover:bg-white/2 transition-colors">
                  <td class="py-2.5 px-3 font-bold text-white">{{ t.name }}</td>
                  <td class="py-2.5 px-3 font-mono">{{ t.code }}</td>
                  <td class="py-2.5 px-3 text-slate-400">{{ t.description || 'N/A' }}</td>
                  <td class="py-2.5 px-3">{{ t.createdAt | date: 'shortDate' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class WorkspaceReportPanel {
  workspace = input.required<Workspace | null>();
  teams = input.required<Team[]>();
  roles = input.required<Role[]>();
}
