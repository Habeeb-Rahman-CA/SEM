import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Fixture Templates Scheduling (e2e)', () => {
  let app: INestApplication<App>;
  let jwtToken: string;
  let workspaceId: string;
  let eventId: string;
  let sportId: string;
  let competitionId: string;
  let stageId: string;
  let venueId: string;
  const teamIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Register and login
    const username = `template_user_${Date.now()}`;
    const password = 'password123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username, password })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username, password })
      .expect(200);

    jwtToken = loginRes.body.accessToken;

    // Create workspace
    const workspaceRes = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Template Workspace',
        description: 'Testing fixture templates',
      })
      .expect(201);

    workspaceId = workspaceRes.body.id;

    // Retrieve Sport ID
    const sportsRes = await request(app.getHttpServer())
      .get('/workspaces/sports')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    const football = sportsRes.body.find((s: any) => s.code === 'football');
    sportId = football.id;

    // Create 4 teams
    for (let i = 1; i <= 4; i++) {
      const teamRes = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/teams`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ name: `Team ${i}`, description: `Team Description ${i}` })
        .expect(201);
      teamIds.push(teamRes.body.id);
    }

    // Create a venue
    const venueRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/venues`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ name: 'Court A', description: 'Main Court', capacity: 100 })
      .expect(201);
    venueId = venueRes.body.id;

    // Create event with these 4 teams
    const eventRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/events`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Template Event 2026',
        description: 'Testing event scheduling templates',
        startDate: new Date('2026-08-01T09:00:00Z').toISOString(),
        endDate: new Date('2026-08-10T18:00:00Z').toISOString(),
        status: 'upcoming',
        teamIds: teamIds,
      })
      .expect(201);
    eventId = eventRes.body.id;

    // Create competition
    const compRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/events/${eventId}/competitions`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Template Competition',
        sportId: sportId,
        status: 'upcoming',
      })
      .expect(201);
    competitionId = compRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create and apply fixture template during schedule generation', async () => {
    // 1. Create a stage of type league
    const stageRes = await request(app.getHttpServer())
      .post(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'League Stage',
        type: 'league',
        sequence: 1,
        config: {
          winPoint: 3,
          drawPoint: 1,
          twoLegged: false,
          legs: 1,
          restDays: 1,
        },
      })
      .expect(201);
    stageId = stageRes.body.id;

    // 2. Create a Fixture Template
    const templateRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/fixture-templates`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Weekend Tournament Template',
        description:
          'Gaps of 120 minutes, 2 matches max per day, rotate venues',
        defaultKickoffTime: '10:00',
        matchIntervalDays: 1,
        matchesPerDay: 2,
        gapBetweenMatchesMinutes: 120,
        venueStrategy: 'rotate_venues',
      })
      .expect(201);

    const fixtureTemplateId = templateRes.body.id;
    expect(fixtureTemplateId).toBeDefined();

    // 3. Generate fixtures with this template
    const genRes = await request(app.getHttpServer())
      .post(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/generate-fixtures`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        fixtureTemplateId,
      })
      .expect(201);

    expect(genRes.body).toHaveProperty('matchesCreated');
    expect(genRes.body.matchesCreated).toBe(6); // 4 teams round-robin = 6 matches

    // 4. Retrieve matches
    const matchesRes = await request(app.getHttpServer())
      .get(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const matches = matchesRes.body;
    expect(matches.length).toBe(6);

    // Verify scheduling properties are applied:
    // Kickoff time should be 10:00 on the day of the match
    // Matches should be scheduled in pairs (matchesPerDay: 2) on successive days
    const dates = matches.map((m: any) => new Date(m.scheduledAt));
    dates.sort((a: any, b: any) => a.getTime() - b.getTime());

    // First pair of matches should be on day 1 at 10:00 and 12:00 (120 min gap)
    expect(dates[0].getHours()).toBe(10);
    expect(dates[0].getMinutes()).toBe(0);

    expect(dates[1].getHours()).toBe(12);
    expect(dates[1].getMinutes()).toBe(0);
    expect(dates[1].getDate()).toBe(dates[0].getDate());

    // Next pair should be on the next day
    expect(dates[2].getHours()).toBe(10);
    expect(dates[2].getDate()).toBe(dates[0].getDate() + 1);

    expect(dates[3].getHours()).toBe(12);
    expect(dates[3].getDate()).toBe(dates[0].getDate() + 1);
  });
});
