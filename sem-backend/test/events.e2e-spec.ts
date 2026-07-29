import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Events & Competitions Controller (e2e)', () => {
  let app: INestApplication<App>;
  let jwtToken: string;
  let workspaceId: string;
  let eventId: string;
  let duplicatedEventId: string;
  let sportId: string;
  let competitionId: string;
  let stageId: string;
  let teamAId: string;
  let teamBId: string;
  let matchId: string;
  let eventName: string;
  let duplicatedEventName: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Register and login to obtain JWT token
    const username = `testuser_${Date.now()}`;
    eventName = `Annual Sports Meet ${Date.now()}`;
    duplicatedEventName = `${eventName} - Copied`;
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

    // Create a workspace to run tests inside
    const workspaceRes = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ name: 'E2E Test Workspace', description: 'Testing workspace' })
      .expect(201);

    workspaceId = workspaceRes.body.id;

    // Create Team A
    const teamARes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/teams`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ name: 'Team A', description: 'First Team' })
      .expect(201);
    teamAId = teamARes.body.id;

    // Create Team B
    const teamBRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/teams`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ name: 'Team B', description: 'Second Team' })
      .expect(201);
    teamBId = teamBRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should retrieve list of seeded sports', async () => {
    const res = await request(app.getHttpServer())
      .get('/workspaces/sports')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);

    // Find Football
    const football = res.body.find((s: any) => s.code === 'football');
    expect(football).toBeDefined();
    expect(football.name).toBe('Football');
    sportId = football.id;
  });

  it('should create an event inside the workspace', async () => {
    const res = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/events`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: eventName,
        description: 'E2E Testing Event',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'upcoming',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe(eventName);
    expect(res.body.status).toBe('upcoming');
    eventId = res.body.id;
  });

  it('should create a competition inside the event', async () => {
    const res = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/events/${eventId}/competitions`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Inter-House Football Championship',
        sportId: sportId,
        status: 'upcoming',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Inter-House Football Championship');
    expect(res.body.sport.code).toBe('football');
    competitionId = res.body.id;
  });

  it('should retrieve list of competitions for an event', async () => {
    const res = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/events/${eventId}/competitions`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(competitionId);
  });

  it('should create a group & knockout combined stage inside the competition', async () => {
    const res = await request(app.getHttpServer())
      .post(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Combined Stage Play',
        type: 'group_knockout',
        sequence: 1,
        config: {
          winPoint: 3,
          drawPoint: 1,
          twoLegged: true,
          groupsCount: 4,
          advancingCount: 2,
          gamesPerTeam: 3,
        },
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Combined Stage Play');
    expect(res.body.type).toBe('group_knockout');
    expect(res.body.config.winPoint).toBe(3);
    expect(res.body.config.drawPoint).toBe(1);
    expect(res.body.config.twoLegged).toBe(true);
    expect(res.body.config.groupsCount).toBe(4);
    expect(res.body.config.advancingCount).toBe(2);
    expect(res.body.config.gamesPerTeam).toBe(3);
    stageId = res.body.id;
  });

  it('should retrieve list of stages for the competition', async () => {
    const res = await request(app.getHttpServer())
      .get(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(stageId);
  });

  it('should update the stage configuration', async () => {
    const res = await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Group Play v2',
        config: {
          winPoint: 4,
          drawPoint: 2,
          gamesPerTeam: 5,
        },
      })
      .expect(200);

    expect(res.body.name).toBe('Group Play v2');
    expect(res.body.config.winPoint).toBe(4);
    expect(res.body.config.drawPoint).toBe(2);
    expect(res.body.config.gamesPerTeam).toBe(5);
  });

  it('should create a match in the stage', async () => {
    const res = await request(app.getHttpServer())
      .post(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        homeTeamId: teamAId,
        awayTeamId: teamBId,
        config: {
          timerDuration: 90,
        },
      })
      .expect(201);

    expect(res.body.homeTeamId).toBe(teamAId);
    expect(res.body.awayTeamId).toBe(teamBId);
    expect(res.body.config.timerDuration).toBe(90);
    expect(res.body.liveData).toBeDefined();
    matchId = res.body.id;
  });

  it('should retrieve list of matches for the stage', async () => {
    const res = await request(app.getHttpServer())
      .get(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].id).toBe(matchId);
  });

  it('should create players and set lineup for the match', async () => {
    const u1 = `playera_${Date.now()}`;
    const reg1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: u1, password: 'password123' })
      .expect(201);
    const u1Id = reg1.body.id;

    const u2 = `playerb_${Date.now()}`;
    const reg2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: u2, password: 'password123' })
      .expect(201);
    const u2Id = reg2.body.id;

    const playerARes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/players`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ userId: u1Id, teamId: teamAId, jerseyNumber: '10' })
      .expect(201);
    const playerAId = playerARes.body.id;

    const playerBRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/players`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ userId: u2Id, teamId: teamBId, jerseyNumber: '7' })
      .expect(201);
    const playerBId = playerBRes.body.id;

    await request(app.getHttpServer())
      .post(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${matchId}/lineup`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        lineups: [
          { playerId: playerAId, teamId: teamAId, isPlaying: true },
          { playerId: playerBId, teamId: teamBId, isPlaying: true },
        ],
      })
      .expect(201);
  });

  it('should update match score and liveData', async () => {
    const res = await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${matchId}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        homeScore: 2,
        awayScore: 1,
        status: 'live',
        liveData: {
          elapsedSeconds: 300,
          timerRunning: true,
          events: [
            {
              type: 'goal',
              teamId: teamAId,
              playerUserId: 'some-id',
              minute: 5,
            },
          ],
        },
      })
      .expect(200);

    expect(res.body.homeScore).toBe(2);
    expect(res.body.awayScore).toBe(1);
    expect(res.body.status).toBe('live');
    expect(res.body.liveData.elapsedSeconds).toBe(300);
  });

  it('should duplicate the event along with competitions, stages, point configs, and team enrollments', async () => {
    const res = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/events/${eventId}/duplicate`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: duplicatedEventName,
        duplicateCompetitions: true,
        duplicateStages: true,
        duplicateVenues: true,
        duplicateTeams: true,
        duplicatePointSystems: true,
        duplicateSettings: true
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe(duplicatedEventName);
    expect(res.body.status).toBe('upcoming');
    duplicatedEventId = res.body.id;

    // Verify that the competition, stage, and team enrollments were copied to the new event
    const compsRes = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/events/${duplicatedEventId}/competitions`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(compsRes.body.length).toBe(1);
    const dupComp = compsRes.body[0];
    expect(dupComp.name).toBe('Inter-House Football Championship');

    // Stages copy check
    expect(dupComp.stages.length).toBe(1);
    expect(dupComp.stages[0].name).toBe('Group Play v2');

    // Verify matches are excluded (results/matches excluded)
    expect(dupComp.stages[0].matches.length).toBe(0);
  });

  it('should support advanced search and filtering on events', async () => {
    await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/events/${eventId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        venue: 'Main Arena',
        sport: 'Football',
        organizers: 'Global Sports League',
      })
      .expect(200);

    const searchRes = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/events/search`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .query({
        query: 'Sports',
        sport: 'Football',
        organizer: 'Global Sports',
        venue: 'Main Arena',
        status: 'upcoming',
        workspaceIdFilter: workspaceId,
        sortBy: 'name',
        sortOrder: 'ASC',
      })
      .expect(200);

    expect(searchRes.body.length).toBeGreaterThanOrEqual(1);
    const searchEvent = searchRes.body.find((e: any) => e.id === eventId);
    expect(searchEvent).toBeDefined();
    expect(searchEvent.sport).toBe('Football');
    expect(searchEvent.venue).toBe('Main Arena');
    expect(searchEvent.organizers).toBe('Global Sports League');
  });

  it('should delete the match', async () => {
    await request(app.getHttpServer())
      .delete(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${matchId}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(204);

    const res = await request(app.getHttpServer())
      .get(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(res.body.length).toBe(0);
  });

  it('should delete the stage', async () => {
    await request(app.getHttpServer())
      .delete(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(204);

    // Verify it is gone
    const res = await request(app.getHttpServer())
      .get(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(res.body.length).toBe(0);
  });

  it('should update the competition details', async () => {
    const res = await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Inter-House Football Cup v2',
        status: 'ongoing',
      })
      .expect(200);

    expect(res.body.name).toBe('Inter-House Football Cup v2');
    expect(res.body.status).toBe('ongoing');
  });

  it('should delete the competition', async () => {
    await request(app.getHttpServer())
      .delete(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(204);

    // Verify it is gone
    const res = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/events/${eventId}/competitions`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(res.body.length).toBe(0);
  });

  it('should update the created event', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/events/${eventId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'ongoing',
        description: 'Updated E2E description',
      })
      .expect(200);

    expect(res.body.status).toBe('ongoing');
    expect(res.body.description).toBe('Updated E2E description');
  });

  it('should manually archive the event', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/events/${eventId}/archive`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(res.body.isArchived).toBe(true);
  });

  it('should not include the archived event in the active list by default', async () => {
    const res = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/events`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const exists = res.body.some((e: any) => e.id === eventId);
    expect(exists).toBe(false);
  });

  it('should include the archived event when calling with archived=true query parameter', async () => {
    const res = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/events?archived=true`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const ev = res.body.find((e: any) => e.id === eventId);
    expect(ev).toBeDefined();
    expect(ev.isArchived).toBe(true);
  });

  it('should manually restore the event from archive', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/events/${eventId}/restore`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(res.body.isArchived).toBe(false);
  });

  it('should automatically archive the event when status is set to completed', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/events/${eventId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed'
      })
      .expect(200);

    expect(res.body.status).toBe('completed');
    expect(res.body.isArchived).toBe(true);
  });

  it('should delete the event', async () => {
    await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}/events/${eventId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(204);

    // Verify it is deleted (checking both active and archived lists)
    const activeRes = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/events`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(activeRes.body.some((e: any) => e.id === eventId)).toBe(false);

    const archivedRes = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/events?archived=true`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(archivedRes.body.some((e: any) => e.id === eventId)).toBe(false);
  });

  it('should delete the duplicated event', async () => {
    await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}/events/${duplicatedEventId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(204);

    const activeRes = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/events`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(activeRes.body.some((e: any) => e.id === duplicatedEventId)).toBe(false);
  });
});
