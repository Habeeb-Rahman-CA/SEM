import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { Venue } from '../../venues/entities/venue.entity';
import { Competition } from '../../competitions/entities/competition.entity';
import { generateTextWithFallback } from '../../../common/ai-client';

export interface AttendanceForecastResponse {
  forecastedSpectators: number;
  forecastedParticipants: number;
  totalForecasted: number;
  confidenceScore: number;
  venueCapacity: number;
  capacityUtilization: number;
  warning: {
    level: 'info' | 'warning' | 'danger';
    message: string;
  };
  resourceEstimates: {
    staffRequired: number;
    securityGuards: number;
    firstAidResponders: number;
    concessionStands: number;
  };
  trendReport: {
    summary: string;
    historicalAverages: {
      spectatorsPerMatch: number;
      participantsPerTeam: number;
    };
  };
  aiAnalysisText: string;
}

@Injectable()
export class AttendanceForecastingService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
  ) {}

  async getAttendanceForecast(
    workspaceId: string,
    eventId: string,
  ): Promise<AttendanceForecastResponse> {
    const event = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
      relations: { teams: true, competitions: true },
    });

    if (!event) {
      throw new NotFoundException(
        `Event "${eventId}" not found in this workspace`,
      );
    }

    let venueCapacity = 1000;
    let venueName = 'Unknown Venue';
    if (event.venue) {
      const venue = await this.venueRepo.findOne({
        where: { name: event.venue, workspaceId },
      });
      if (venue) {
        venueName = venue.name;
        if (venue.capacity) {
          venueCapacity = venue.capacity;
        }
      }
    }

    const historicalEvents = await this.eventRepo.find({
      where: { workspaceId, status: 'completed' },
      relations: { teams: true, competitions: true },
      take: 5,
    });

    const enrolledTeamsCount = event.teams?.length || 0;
    const competitionsCount = event.competitions?.length || 0;

    const prompt = this.buildPrompt(
      event,
      venueName,
      venueCapacity,
      enrolledTeamsCount,
      competitionsCount,
      historicalEvents,
    );

    try {
      const aiResponse = await generateTextWithFallback(prompt);
      if (aiResponse) {
        const cleaned = this.extractJson(aiResponse);
        if (cleaned) {
          const parsed = JSON.parse(cleaned) as AttendanceForecastResponse;
          if (
            parsed.forecastedSpectators !== undefined &&
            parsed.forecastedParticipants !== undefined &&
            parsed.resourceEstimates
          ) {
            return parsed;
          }
        }
      }
    } catch (err) {
      console.error('Failed to generate attendance forecast with AI:', err);
    }

    return this.generateRuleBasedForecast(
      venueCapacity,
      enrolledTeamsCount,
      competitionsCount,
    );
  }

  private buildPrompt(
    event: Event,
    venueName: string,
    venueCapacity: number,
    enrolledTeams: number,
    competitions: number,
    historicalEvents: Event[],
  ): string {
    const historyInfo = historicalEvents
      .map(
        (e) =>
          `- Event: ${e.name}, Sport: ${e.sport || 'N/A'}, Teams: ${e.teams?.length || 0}, Venue: ${e.venue || 'N/A'}`,
      )
      .join('\n');

    return `
You are an expert event planning model. Generate an attendance forecast, venue capacity analysis, staffing estimates, and resource requirements for the following sports event:

Event Name: ${event.name}
Sport: ${event.sport || 'Multi-sport'}
Venue: ${venueName}
Venue Capacity: ${venueCapacity}
Enrolled Teams count: ${enrolledTeams}
Competitions count: ${competitions}

Historical Completed Events in Workspace:
${historyInfo || 'No historical event data available.'}

Please output:
1. "forecastedSpectators" and "forecastedParticipants" (based on sports context, team sizes, and historical data).
2. "totalForecasted" (sum of both).
3. "capacityUtilization" (percentage of totalForecasted / venueCapacity).
4. "warning": Provide warnings if attendance is unusually high (> 85% utilization, level="warning" or level="danger") or unusually low (< 15% utilization, level="warning"). Otherwise, provide an info level alert.
5. "resourceEstimates": Estimate required "staffRequired", "securityGuards", "firstAidResponders", and "concessionStands" based on total turn-out.
6. "trendReport": Generate summary of the trend comparing to historical data.
7. "aiAnalysisText": Detailed analysis paragraph.

Return ONLY a valid JSON object matching the following structure:
{
  "forecastedSpectators": 1250,
  "forecastedParticipants": 320,
  "totalForecasted": 1570,
  "confidenceScore": 85,
  "venueCapacity": 2000,
  "capacityUtilization": 78.5,
  "warning": {
    "level": "info",
    "message": "Attendance is projected within normal limits."
  },
  "resourceEstimates": {
    "staffRequired": 25,
    "securityGuards": 12,
    "firstAidResponders": 4,
    "concessionStands": 6
  },
  "trendReport": {
    "summary": "Spectator interest has grown by 12% compared to historical events.",
    "historicalAverages": {
      "spectatorsPerMatch": 120,
      "participantsPerTeam": 16
    }
  },
  "aiAnalysisText": "Detailed qualitative analysis..."
}
`;
  }

  private extractJson(text: string): string | null {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return text.substring(start, end + 1);
    }
    return null;
  }

  private generateRuleBasedForecast(
    venueCapacity: number,
    enrolledTeams: number,
    competitions: number,
  ): AttendanceForecastResponse {
    const forecastedParticipants = enrolledTeams * 18;
    const baseSpectators = competitions * 120;
    const forecastedSpectators = Math.min(
      baseSpectators,
      Math.max(200, venueCapacity - forecastedParticipants - 100),
    );
    const totalForecasted = forecastedParticipants + forecastedSpectators;
    const capacityUtilization = parseFloat(
      ((totalForecasted / venueCapacity) * 100).toFixed(1),
    );

    let warningLevel: 'info' | 'warning' | 'danger' = 'info';
    let warningMessage = 'Projected turnout is within normal capacity limits.';

    if (capacityUtilization > 90) {
      warningLevel = 'danger';
      warningMessage =
        'Critical capacity warning: Turnout is forecasted to exceed 90% of venue capacity. Prepare extra security and entrance controls.';
    } else if (capacityUtilization > 75) {
      warningLevel = 'warning';
      warningMessage =
        'High attendance alert: Event is projected to fill over 75% of venue capacity. Ensure sufficient staffing and concession stands.';
    } else if (capacityUtilization < 15) {
      warningLevel = 'warning';
      warningMessage =
        'Low attendance alert: Turnout is projected at under 15% of venue capacity. You may optimize resources or decrease active staffing.';
    }

    const staffRequired = Math.max(5, Math.round(totalForecasted / 60));
    const securityGuards = Math.max(2, Math.round(totalForecasted / 120));
    const firstAidResponders = Math.max(1, Math.round(totalForecasted / 400));
    const concessionStands = Math.max(1, Math.round(totalForecasted / 250));

    return {
      forecastedSpectators,
      forecastedParticipants,
      totalForecasted,
      confidenceScore: 65,
      venueCapacity,
      capacityUtilization,
      warning: {
        level: warningLevel,
        message: warningMessage,
      },
      resourceEstimates: {
        staffRequired,
        securityGuards,
        firstAidResponders,
        concessionStands,
      },
      trendReport: {
        summary:
          'Attendance trend generated using base coefficients mapping enrolled team registration and competition schedules.',
        historicalAverages: {
          spectatorsPerMatch: 100,
          participantsPerTeam: 18,
        },
      },
      aiAnalysisText:
        'A statistical projection calculated using local heuristics: participant count is estimated at 18 members per team, and spectator counts correlate to total registered competitions capped at total venue capacity limits.',
    };
  }
}
