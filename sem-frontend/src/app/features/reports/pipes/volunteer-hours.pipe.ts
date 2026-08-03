import { Pipe, PipeTransform } from '@angular/core';
import { VolunteerAssignment, VolunteerReportRow } from '../models/report.interface';

@Pipe({ name: 'volunteerHours', standalone: true })
export class VolunteerHoursPipe implements PipeTransform {
  transform(v: VolunteerReportRow | null | undefined): number {
    if (!v) return 0;
    const completed = (v.assignments || []).filter(
      (a: VolunteerAssignment) => a.status === 'attended',
    );
    return completed.reduce(
      (sum: number, a: VolunteerAssignment) => sum + Number(a.serviceHours || 0),
      0,
    );
  }
}
