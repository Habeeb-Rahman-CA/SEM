import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Fixture Generation (e2e)', () => {
  let app: INestApplication<App>;
  let jwtToken: string;
  let workspaceId: string;
  let eventId: string;
  let sportId: string;
  let competitionId: string;
  let stageId: string;
  let teamIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Register and login
    const username = `fixture_user_${Date.now()}`;
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
      .send({ name: 'Fixture Workspace', description: 'Testing fixtures' })
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

    // Create event with these 4 teams
    const eventRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/events`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Fixture Event 2026',
        description: 'Fixture Event Description',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
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
        name: 'Fixture Competition',
        sportId: sportId,
        status: 'upcoming',
      })
      .expect(201);
    competitionId = compRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should generate fixtures for group_knockout with 2 groups and 4 teams', async () => {
    // 1. Create a stage of type group_knockout with 2 groups
    const stageRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Group + KO Stage',
        type: 'group_knockout',
        sequence: 1,
        config: {
          winPoint: 3,
          drawPoint: 1,
          twoLegged: false,
          legs: 1,
          groupKnockoutSubtype: 'multiple_groups',
          groupsCount: 2,
          advancingType: 'winner',
          advancingCount: 1,
        },
      })
      .expect(201);
    stageId = stageRes.body.id;

    // 2. Generate fixtures
    const genRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/generate-fixtures`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(201);

    expect(genRes.body).toHaveProperty('matchesCreated');

    // 3. Retrieve matches
    const matchesRes = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const matches = matchesRes.body;
    console.log('--- GENERATED MATCHES ---');
    matches.forEach((m: any) => {
      console.log(`Match ID: ${m.id}, Home: ${m.homeTeam?.name || 'TBD'} (${m.homeTeamId}), Away: ${m.awayTeam?.name || 'TBD'} (${m.awayTeamId}), Round: ${m.config?.round}`);
    });
    console.log('-------------------------');

    // Group stage matches should have defined team IDs, and each unique team should appear in only one group
    const groupMatches = matches.filter((m: any) => m.config?.round?.startsWith('Group'));
    expect(groupMatches.length).toBeGreaterThan(0);

    const groupTeamsMap = new Map<string, Set<string>>();
    groupMatches.forEach((m: any) => {
      const round = m.config.round; // e.g. "Group A"
      if (!groupTeamsMap.has(round)) {
        groupTeamsMap.set(round, new Set());
      }
      if (m.homeTeamId) groupTeamsMap.get(round)!.add(m.homeTeamId);
      if (m.awayTeamId) groupTeamsMap.get(round)!.add(m.awayTeamId);
    });

    console.log('Group Teams Map:', Array.from(groupTeamsMap.entries()).map(([k, v]) => [k, Array.from(v)]));

    // Verify groups have unique teams (no overlap between Group A and Group B)
    const groupA = groupTeamsMap.get('Group A') || new Set();
    const groupB = groupTeamsMap.get('Group B') || new Set();

    expect(groupA.size).toBe(2);
    expect(groupB.size).toBe(2);

    const intersection = new Set([...groupA].filter(x => groupB.has(x)));
    expect(intersection.size).toBe(0);

    // 4. Complete a match in Group A and verify that Group B matches are NOT changed
    const groupAMatch = groupMatches.find((m: any) => m.config.round === 'Group A');
    expect(groupAMatch).toBeDefined();

    const originalGroupBMatches = groupMatches.filter((m: any) => m.config.round === 'Group B');
    const originalGroupBTeamIds = originalGroupBMatches.map((m: any) => [m.homeTeamId, m.awayTeamId]);

    // Update match in Group A to completed
    await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${groupAMatch.id}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 3,
        awayScore: 1,
        liveData: { result: 'Home Win' }
      })
      .expect(200);

    // Retrieve matches again and check Group B matches have not changed
    const matchesResAfter = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const groupBMatchesAfter = matchesResAfter.body.filter((m: any) => m.config.round === 'Group B');
    const groupBTeamIdsAfter = groupBMatchesAfter.map((m: any) => [m.homeTeamId, m.awayTeamId]);

    expect(groupBTeamIdsAfter).toEqual(originalGroupBTeamIds);

    // 5. Complete Group B match and verify the winners are promoted to the Final
    const groupBMatch = groupMatches.find((m: any) => m.config.round === 'Group B');
    expect(groupBMatch).toBeDefined();

    // Complete the Group B match with Away Win (so the away team wins Group B)
    await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${groupBMatch.id}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 1,
        awayScore: 3,
        liveData: { result: 'Away Win' }
      })
      .expect(200);

    // Retrieve all matches to see if the Final match has been updated with the winners
    const finalRes = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const finalMatch = finalRes.body.find((m: any) => m.config?.round === 'Final');
    expect(finalMatch).toBeDefined();

    // Winner of Group A is the home team of the completed Group A match
    const winnerGroupA = groupAMatch.homeTeamId;
    // Winner of Group B is the away team of the completed Group B match (since awayScore was 3 vs 1)
    const winnerGroupB = groupBMatch.awayTeamId;

    expect(finalMatch.homeTeamId).toBe(winnerGroupA);
    expect(finalMatch.awayTeamId).toBe(winnerGroupB);

    const thirdMatch = finalRes.body.find((m: any) => m.config?.round === 'Third Place Match');
    expect(thirdMatch).toBeDefined();
    expect(thirdMatch.homeTeamId).toBe(groupAMatch.awayTeamId); // Group A runner-up (Team 4)
    expect(thirdMatch.awayTeamId).toBe(groupBMatch.homeTeamId); // Group B runner-up (Team 1)

    // 6. Set competition pointsConfig
    await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        pointsConfig: [
          { position: 1, label: 'Winner', points: 10 },
          { position: 2, label: 'Runner-up', points: 5 }
        ]
      })
      .expect(200);

    // Complete Third Place Match
    await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${thirdMatch.id}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 1,
        awayScore: 0
      })
      .expect(200);

    // 7. Complete the Final match (Group A winner wins, Group B winner loses)
    await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${finalMatch.id}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 2,
        awayScore: 0
      })
      .expect(200);

    // 8. Verify competition status is automatically set to 'completed'
    const compRes = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/events/${eventId}/competitions`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    const updatedComp = compRes.body.find((c: any) => c.id === competitionId);
    expect(updatedComp.status).toBe('completed');

    // 9. Fetch event standings and verify points calculation
    const standingsRes = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/events/${eventId}/standings`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const standings = standingsRes.body;
    expect(standings.length).toBe(4);

    // WinnerGroupA (home team of Final, won 2-0) should be 1st with 10 points
    const firstPlace = standings[0];
    expect(firstPlace.teamId).toBe(winnerGroupA);
    expect(firstPlace.points).toBe(10);

    // WinnerGroupB (away team of Final, lost 2-0) should be 2nd with 5 points
    const secondPlace = standings[1];
    expect(secondPlace.teamId).toBe(winnerGroupB);
    expect(secondPlace.points).toBe(5);
  });

  it('should generate fixtures for knockout stage with 4 teams and handle third-place playoff', async () => {
    // 1. Create a new competition for knockout
    const koCompRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/events/${eventId}/competitions`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Knockout Competition',
        sportId: sportId,
        status: 'upcoming',
      })
      .expect(201);
    const koCompId = koCompRes.body.id;

    // 2. Create a stage of type knockout
    const koStageRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/events/${eventId}/competitions/${koCompId}/stages`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Knockout Stage',
        type: 'knockout',
        sequence: 1,
        config: {
          twoLegged: false,
          legs: 1,
        },
      })
      .expect(201);
    const koStageId = koStageRes.body.id;

    // 3. Generate fixtures
    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/events/${eventId}/competitions/${koCompId}/generate-fixtures`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(201);

    // 4. Retrieve matches
    const matchesRes = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/events/${eventId}/competitions/${koCompId}/stages/${koStageId}/matches`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const matches = matchesRes.body;
    
    // There should be 2 Semi-Finals, 1 Final, and 1 Third Place Match
    const semiFinals = matches.filter((m: any) => m.config?.round === 'Semi-Final');
    const finalMatch = matches.find((m: any) => m.config?.round === 'Final');
    const thirdMatch = matches.find((m: any) => m.config?.round === 'Third Place Match');

    expect(semiFinals.length).toBe(2);
    expect(finalMatch).toBeDefined();
    expect(thirdMatch).toBeDefined();

    // 5. Complete Semi-Final 1 (Team 1 vs Team 2 -> Team 1 wins, Team 2 loses)
    const sf1 = semiFinals[0];
    await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/events/${eventId}/competitions/${koCompId}/stages/${koStageId}/matches/${sf1.id}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 3,
        awayScore: 1,
        liveData: { result: 'Home Win' }
      })
      .expect(200);

    // 6. Complete Semi-Final 2 (Team 3 vs Team 4 -> Team 4 wins, Team 3 loses)
    const sf2 = semiFinals[1];
    await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/events/${eventId}/competitions/${koCompId}/stages/${koStageId}/matches/${sf2.id}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 1,
        awayScore: 2,
        liveData: { result: 'Away Win' }
      })
      .expect(200);

    // 7. Verify the winners advanced to the Final, and losers to the Third Place Match
    const matchesAfterSFRes = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/events/${eventId}/competitions/${koCompId}/stages/${koStageId}/matches`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const updatedFinal = matchesAfterSFRes.body.find((m: any) => m.id === finalMatch.id);
    const updatedThird = matchesAfterSFRes.body.find((m: any) => m.id === thirdMatch.id);

    const sf1Winner = sf1.homeTeamId;
    const sf1Loser = sf1.awayTeamId;
    const sf2Winner = sf2.awayTeamId;
    const sf2Loser = sf2.homeTeamId;

    expect(updatedFinal.homeTeamId).toBe(sf1Winner);
    expect(updatedFinal.awayTeamId).toBe(sf2Winner);
    expect(updatedThird.homeTeamId).toBe(sf1Loser);
    expect(updatedThird.awayTeamId).toBe(sf2Loser);
  });
});
