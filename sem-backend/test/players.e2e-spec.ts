import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Players Domain (e2e)', () => {
  let app: INestApplication<App>;
  let jwtToken: string;
  let workspaceId: string;
  let teamId: string;
  let memberUserId: string;
  let playerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 1. Register and login the admin user
    const username = `admin_user_${Date.now()}`;
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

    // 2. Create workspace
    const workspaceRes = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Players E2E Workspace',
        description: 'Testing player endpoints',
      })
      .expect(201);

    workspaceId = workspaceRes.body.id;

    // 3. Register another user to serve as a player workspace member
    const playerUsername = `player_member_${Date.now()}`;
    const playerRegisterRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: playerUsername, password: 'password123' })
      .expect(201);

    memberUserId = playerRegisterRes.body.id;

    // Login as the player user to accept the invitation later
    const playerLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: playerUsername, password: 'password123' })
      .expect(200);
    const playerJwtToken = playerLoginRes.body.accessToken;

    // Add that player user as a workspace member (invite)
    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ username: playerUsername, role: 'viewer' })
      .expect(201);

    // Accept the invitation as the player user
    await request(app.getHttpServer())
      .post(`/workspaces/invitations/${workspaceId}/accept`)
      .set('Authorization', `Bearer ${playerJwtToken}`)
      .expect(201);

    // 4. Create a team
    const teamRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/teams`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ name: 'E2E Player Team', description: 'Team for players' })
      .expect(201);

    teamId = teamRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register a player (POST /workspaces/:workspaceId/players)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/players`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        userId: memberUserId,
        teamId: teamId,
        jerseyNumber: '7',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.userId).toBe(memberUserId);
    expect(res.body.teamId).toBe(teamId);
    expect(res.body.jerseyNumber).toBe('7');
    playerId = res.body.id;
  });

  it('should fetch the list of players (GET /workspaces/:workspaceId/players)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/players`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const found = res.body.find((p: any) => p.id === playerId);
    expect(found).toBeDefined();
    expect(found.jerseyNumber).toBe('7');
  });

  it('should update a player (PATCH /workspaces/:workspaceId/players/:playerId)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/players/${playerId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        teamId: teamId,
        jerseyNumber: '10',
      })
      .expect(200);

    expect(res.body.jerseyNumber).toBe('10');
  });

  it('should retrieve player statistics (GET /workspaces/:workspaceId/players/:playerId/stats)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/players/${playerId}/stats`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('player');
    expect(res.body).toHaveProperty('allTime');
    expect(res.body).toHaveProperty('competitions');
    expect(res.body.player.id).toBe(playerId);
  });

  it('should remove a player (DELETE /workspaces/:workspaceId/players/:playerId)', async () => {
    await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}/players/${playerId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(204);
  });
});
