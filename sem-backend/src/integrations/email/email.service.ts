import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: this.configService.get<boolean>('SMTP_SECURE', port === 465),
        auth: { user, pass },
      });
      this.logger.log('SMTP Transporter initialized successfully');
    } else {
      this.logger.warn(
        'SMTP credentials not fully configured. Email notifications will be logged to console.',
      );
    }
  }

  /**
   * General email send utility
   */
  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    const from = this.configService.get<string>(
      'SMTP_FROM',
      '"Taisen Platform" <noreply@taisen.app>',
    );
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from,
          to,
          subject,
          html,
        });
        this.logger.log(`Email successfully sent to ${to}`);
        return true;
      } catch (err) {
        this.logger.error(
          `Failed to send email to ${to}: ${err.message}`,
          err.stack,
        );
        return false;
      }
    } else {
      this.logger.log(
        `[MOCK EMAIL SENT]\nTo: ${to}\nSubject: ${subject}\nContent Summary: ${html.substring(0, 400).replace(/<[^>]*>/g, '')}...`,
      );
      return true;
    }
  }

  /**
   * Wrap email contents in a beautifully branded workspace template
   */
  private wrapTemplate(
    contentHtml: string,
    workspaceName: string,
    logoUrl?: string | null,
    primaryColor = '#7c3aed',
  ): string {
    const logoImg = logoUrl
      ? `<img src="${logoUrl}" alt="${workspaceName} Logo" style="max-height: 48px; border-radius: 8px;" />`
      : `<span style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">${workspaceName}</span>`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #cbd5e1; margin: 0; padding: 20px 0; -webkit-font-smoothing: antialiased; }
            .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }
            .header { padding: 24px; text-align: center; border-bottom: 1px solid #334155; background-color: #0f172a; color: #ffffff; }
            .body { padding: 32px 24px; line-height: 1.6; }
            .footer { padding: 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #334155; background-color: #0f172a; }
            .button { display: inline-block; padding: 12px 24px; font-size: 13px; font-weight: bold; color: #ffffff !important; background-color: ${primaryColor}; text-decoration: none; border-radius: 8px; margin: 20px 0; text-align: center; box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.2); }
            h1, h2, h3 { color: #ffffff; margin-top: 0; }
            p { margin: 0 0 16px 0; }
            .badge { display: inline-block; padding: 4px 10px; font-size: 10px; font-weight: bold; text-transform: uppercase; border-radius: 4px; background-color: #334155; color: #94a3b8; }
            .card { background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin: 16px 0; }
            .divider { height: 1px; background-color: #334155; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${logoImg}
            </div>
            <div class="body">
              ${contentHtml}
            </div>
            <div class="footer">
              <p style="margin: 0 0 4px 0;">This notification was sent on behalf of ${workspaceName}.</p>
              <p style="margin: 0;">Powered by Taisen Sports Event Management Platform.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * 1. Registration Confirmation Email Template
   */
  async sendRegistrationEmail(
    to: string,
    workspaceName: string,
    logoUrl: string | null,
    teamName: string,
    eventName: string,
    viewUrl: string,
  ): Promise<boolean> {
    const subject = `Registration Confirmed: ${teamName} for ${eventName}`;
    const content = `
      <h1>Registration Confirmed!</h1>
      <p>Hello,</p>
      <p>We are excited to confirm that your team <strong>${teamName}</strong> has been successfully registered for <strong>${eventName}</strong>.</p>
      
      <div class="card">
        <h3 style="margin-bottom: 10px; color: #a78bfa;">Event Registration Details</h3>
        <p style="margin-bottom: 8px;"><strong>Event:</strong> ${eventName}</p>
        <p style="margin-bottom: 8px;"><strong>Registered Team:</strong> ${teamName}</p>
        <p style="margin-bottom: 0;"><strong>Status:</strong> <span class="badge" style="background-color: #10b981; color: #052e16;">Confirmed</span></p>
      </div>

      <p>You can check the fixtures, schedules, and live standings on the public event portal using the link below:</p>
      <div style="text-align: center;">
        <a href="${viewUrl}" class="button">Go to Event Hub</a>
      </div>
      <p>Good luck with the event! If you have any questions, please contact the event organizer.</p>
    `;
    const html = this.wrapTemplate(content, workspaceName, logoUrl);
    return this.sendEmail(to, subject, html);
  }

  /**
   * 2. Fixtures Released Email Template
   */
  async sendFixtureReleaseEmail(
    to: string,
    workspaceName: string,
    logoUrl: string | null,
    stageName: string,
    compName: string,
    eventName: string,
    viewUrl: string,
  ): Promise<boolean> {
    const subject = `Fixtures Released: ${compName} - ${stageName}`;
    const content = `
      <h1>Fixtures Released!</h1>
      <p>Hello,</p>
      <p>The match schedules and fixtures have been officially generated and released for <strong>${stageName}</strong> of the <strong>${compName}</strong> competition.</p>
      
      <div class="card">
        <h3 style="margin-bottom: 10px; color: #a78bfa;">Competition Info</h3>
        <p style="margin-bottom: 8px;"><strong>Event:</strong> ${eventName}</p>
        <p style="margin-bottom: 8px;"><strong>Competition:</strong> ${compName}</p>
        <p style="margin-bottom: 0;"><strong>Stage:</strong> ${stageName}</p>
      </div>

      <p>You can view your match schedule, venues, and timings on the public event portal now:</p>
      <div style="text-align: center;">
        <a href="${viewUrl}" class="button">View Match Schedule</a>
      </div>
      <p>Stay prepared and show your best performance!</p>
    `;
    const html = this.wrapTemplate(content, workspaceName, logoUrl);
    return this.sendEmail(to, subject, html);
  }

  /**
   * 3. Schedule Update Email Template
   */
  async sendScheduleUpdateEmail(
    to: string,
    workspaceName: string,
    logoUrl: string | null,
    homeTeam: string,
    awayTeam: string,
    dateString: string,
    venueName: string,
    compName: string,
    eventName: string,
    viewUrl: string,
  ): Promise<boolean> {
    const subject = `Match Schedule Updated: ${homeTeam} vs ${awayTeam}`;
    const content = `
      <h1>Match Schedule Updated</h1>
      <p>Hello,</p>
      <p>Please note that the schedule for the match between <strong>${homeTeam}</strong> and <strong>${awayTeam}</strong> has been updated by the organizer.</p>
      
      <div class="card">
        <h3 style="margin-bottom: 10px; color: #f59e0b;">Updated Match Details</h3>
        <p style="margin-bottom: 8px;"><strong>Matchup:</strong> ${homeTeam} vs ${awayTeam}</p>
        <p style="margin-bottom: 8px;"><strong>New Time:</strong> ${dateString}</p>
        <p style="margin-bottom: 8px;"><strong>Venue:</strong> ${venueName}</p>
        <p style="margin-bottom: 0;"><strong>Competition:</strong> ${compName} (${eventName})</p>
      </div>

      <p>Please ensure your team and players are updated with these changes. You can view full details on the match hub:</p>
      <div style="text-align: center;">
        <a href="${viewUrl}" class="button">View Updated Fixture</a>
      </div>
    `;
    const html = this.wrapTemplate(content, workspaceName, logoUrl);
    return this.sendEmail(to, subject, html);
  }

  /**
   * 4. Match Reminder Email Template
   */
  async sendReminderEmail(
    to: string,
    workspaceName: string,
    logoUrl: string | null,
    homeTeam: string,
    awayTeam: string,
    matchTime: string,
    venueName: string,
    compName: string,
    eventName: string,
    viewUrl: string,
  ): Promise<boolean> {
    const subject = `Match Reminder: ${homeTeam} vs ${awayTeam}`;
    const content = `
      <h1>Upcoming Match Reminder</h1>
      <p>Hello,</p>
      <p>This is a quick reminder that you have an upcoming match scheduled soon. Please review the details below:</p>
      
      <div class="card">
        <h3 style="margin-bottom: 10px; color: #3b82f6;">Match Schedule</h3>
        <p style="margin-bottom: 8px;"><strong>Fixture:</strong> ${homeTeam} vs ${awayTeam}</p>
        <p style="margin-bottom: 8px;"><strong>Time:</strong> ${matchTime}</p>
        <p style="margin-bottom: 8px;"><strong>Venue:</strong> ${venueName}</p>
        <p style="margin-bottom: 0;"><strong>Competition:</strong> ${compName} (${eventName})</p>
      </div>

      <p>Make sure to report on time. View details and lineups on the portal:</p>
      <div style="text-align: center;">
        <a href="${viewUrl}" class="button">View Match Hub</a>
      </div>
    `;
    const html = this.wrapTemplate(content, workspaceName, logoUrl);
    return this.sendEmail(to, subject, html);
  }

  /**
   * 5. Match Cancellation Email Template
   */
  async sendCancellationEmail(
    to: string,
    workspaceName: string,
    logoUrl: string | null,
    matchTitle: string,
    reason: string,
    eventName: string,
  ): Promise<boolean> {
    const subject = `Cancelled: ${matchTitle}`;
    const content = `
      <h1 style="color: #ef4444;">Fixture Cancelled</h1>
      <p>Hello,</p>
      <p>We regret to inform you that the match <strong>${matchTitle}</strong> has been cancelled by the event organizers.</p>
      
      <div class="card" style="border-color: #ef4444;">
        <h3 style="margin-bottom: 10px; color: #ef4444;">Cancellation Details</h3>
        <p style="margin-bottom: 8px;"><strong>Fixture:</strong> ${matchTitle}</p>
        <p style="margin-bottom: 8px;"><strong>Event:</strong> ${eventName}</p>
        <p style="margin-bottom: 0;"><strong>Reason:</strong> ${reason || 'Not specified'}</p>
      </div>

      <p>We apologize for any inconvenience caused. Please check the public event portal for alternative fixtures or updates.</p>
    `;
    const html = this.wrapTemplate(content, workspaceName, logoUrl);
    return this.sendEmail(to, subject, html);
  }

  /**
   * 6. Event Completion Email Template
   */
  async sendEventCompletionEmail(
    to: string,
    workspaceName: string,
    logoUrl: string | null,
    eventName: string,
    winnerName: string,
    runnerUpName: string,
    viewUrl: string,
  ): Promise<boolean> {
    const subject = `Event Completed: ${eventName}`;
    const content = `
      <h1>Event Completed! 🏆</h1>
      <p>Hello,</p>
      <p>We are thrilled to announce that <strong>${eventName}</strong> has successfully completed. Thank you to all participants, managers, and fans!</p>
      
      <div class="card" style="border-color: #f59e0b; text-align: center;">
        <h2 style="color: #f59e0b; margin-bottom: 15px;">Champions</h2>
        <div style="font-size: 24px; font-weight: 800; color: #ffffff; margin-bottom: 10px;">🏆 ${winnerName}</div>
        <p style="color: #94a3b8; font-size: 12px; margin: 0 0 10px 0;">Runner-Up: ${runnerUpName || 'N/A'}</p>
      </div>

      <p>You can view the final standings, results history, and player stats leaderboard on the portal:</p>
      <div style="text-align: center;">
        <a href="${viewUrl}" class="button">View Final Standings</a>
      </div>
      <p>Congratulations to the winners and congratulations to all teams for a great tournament!</p>
    `;
    const html = this.wrapTemplate(content, workspaceName, logoUrl);
    return this.sendEmail(to, subject, html);
  }

  /**
   * 7. Match Start Announcement Email Template
   */
  async sendMatchStartEmail(
    to: string,
    workspaceName: string,
    logoUrl: string | null,
    homeTeam: string,
    awayTeam: string,
    viewUrl: string,
  ): Promise<boolean> {
    const subject = `Match Started: ${homeTeam} vs ${awayTeam}`;
    const content = `
      <h1 style="color: #10b981;">Match is Live!</h1>
      <p>Hello,</p>
      <p>The match between <strong>${homeTeam}</strong> and <strong>${awayTeam}</strong> has officially started.</p>
      
      <div class="card" style="border-color: #10b981;">
        <h3 style="margin-bottom: 10px; color: #10b981;">Match Details</h3>
        <p style="margin-bottom: 8px;"><strong>Fixture:</strong> ${homeTeam} vs ${awayTeam}</p>
        <p style="margin-bottom: 0;"><strong>Status:</strong> <span class="badge" style="background-color: #10b981; color: #052e16;">Live</span></p>
      </div>

      <p>Follow live scores, events, and stats on the match hub portal:</p>
      <div style="text-align: center;">
        <a href="${viewUrl}" class="button">Go to Match Hub</a>
      </div>
    `;
    const html = this.wrapTemplate(content, workspaceName, logoUrl);
    return this.sendEmail(to, subject, html);
  }

  /**
   * 8. Match Result Announcement Email Template
   */
  async sendMatchResultEmail(
    to: string,
    workspaceName: string,
    logoUrl: string | null,
    homeTeam: string,
    awayTeam: string,
    homeScore: number,
    awayScore: number,
    viewUrl: string,
  ): Promise<boolean> {
    const subject = `Match Completed: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`;
    const content = `
      <h1>Match Completed!</h1>
      <p>Hello,</p>
      <p>The match between <strong>${homeTeam}</strong> and <strong>${awayTeam}</strong> has concluded. Here are the final scores:</p>
      
      <div class="card">
        <h3 style="margin-bottom: 15px; color: #a78bfa; text-align: center;">Final Score</h3>
        <div style="font-size: 22px; font-weight: 800; text-align: center; color: #ffffff;">
          ${homeTeam} <span style="color: #a78bfa;">${homeScore}</span> : <span style="color: #a78bfa;">${awayScore}</span> ${awayTeam}
        </div>
      </div>

      <p>View full stats, player performances, and updated standings on the portal:</p>
      <div style="text-align: center;">
        <a href="${viewUrl}" class="button">View Match Results</a>
      </div>
    `;
    const html = this.wrapTemplate(content, workspaceName, logoUrl);
    return this.sendEmail(to, subject, html);
  }

  /**
   * 9. Match Delay Announcement Email Template
   */
  async sendMatchDelayEmail(
    to: string,
    workspaceName: string,
    logoUrl: string | null,
    homeTeam: string,
    awayTeam: string,
    newTime: string,
    viewUrl: string,
  ): Promise<boolean> {
    const subject = `Match Delayed: ${homeTeam} vs ${awayTeam}`;
    const content = `
      <h1 style="color: #f59e0b;">Match Delayed / Rescheduled</h1>
      <p>Hello,</p>
      <p>Please be advised that the match between <strong>${homeTeam}</strong> and <strong>${awayTeam}</strong> has been delayed or rescheduled by the organizers.</p>
      
      <div class="card" style="border-color: #f59e0b;">
        <h3 style="margin-bottom: 10px; color: #f59e0b;">Rescheduled Details</h3>
        <p style="margin-bottom: 8px;"><strong>Fixture:</strong> ${homeTeam} vs ${awayTeam}</p>
        <p style="margin-bottom: 0;"><strong>New Scheduled Time:</strong> ${newTime}</p>
      </div>

      <p>Check the updated schedule and match details on the portal:</p>
      <div style="text-align: center;">
        <a href="${viewUrl}" class="button">View Updated Fixture</a>
      </div>
    `;
    const html = this.wrapTemplate(content, workspaceName, logoUrl);
    return this.sendEmail(to, subject, html);
  }

  /**
   * 10. Match Venue Change Announcement Email Template
   */
  async sendVenueChangeEmail(
    to: string,
    workspaceName: string,
    logoUrl: string | null,
    homeTeam: string,
    awayTeam: string,
    newVenue: string,
    viewUrl: string,
  ): Promise<boolean> {
    const subject = `Match Venue Changed: ${homeTeam} vs ${awayTeam}`;
    const content = `
      <h1 style="color: #f59e0b;">Match Venue Changed</h1>
      <p>Hello,</p>
      <p>Please note that the venue for the match between <strong>${homeTeam}</strong> and <strong>${awayTeam}</strong> has been changed.</p>
      
      <div class="card" style="border-color: #f59e0b;">
        <h3 style="margin-bottom: 10px; color: #f59e0b;">New Venue Details</h3>
        <p style="margin-bottom: 8px;"><strong>Fixture:</strong> ${homeTeam} vs ${awayTeam}</p>
        <p style="margin-bottom: 0;"><strong>New Venue:</strong> ${newVenue}</p>
      </div>

      <p>Check the match hub for location maps and directions:</p>
      <div style="text-align: center;">
        <a href="${viewUrl}" class="button">Go to Match Hub</a>
      </div>
    `;
    const html = this.wrapTemplate(content, workspaceName, logoUrl);
    return this.sendEmail(to, subject, html);
  }
}
