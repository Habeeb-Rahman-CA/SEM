import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { WorkspaceMembersComponent } from '../../../pages/members/members';
import type { Workspace, WorkspaceMember, Role } from '../../../services/workspace.service';

@Component({
  selector: 'app-workspace-members-panel',
  standalone: true,
  imports: [WorkspaceMembersComponent],
  templateUrl: './members-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceMembersPanelComponent {
  workspace = input.required<Workspace | null>();
  members = input.required<WorkspaceMember[]>();
  assignableRoles = input.required<Role[]>();
  canInvite = input<boolean>(false);
  canUpdate = input<boolean>(false);
  canRemove = input<boolean>(false);

  membersChange = output<WorkspaceMember[]>();
}
