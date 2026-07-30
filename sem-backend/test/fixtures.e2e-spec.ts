import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Fixture Generation (e2e)', () => {
  let app: INestApplication<App>;
  let jwtToken: string;
  let workspaceId: string;
  let eventId: string;
  let sportId: string;
  let competitionId: string;
  let stageId: string;
  const teamIds: string[] = [];

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
      .post(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages`,
      )
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
      .post(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/generate-fixtures`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(201);

    expect(genRes.body).toHaveProperty('matchesCreated');

    // 3. Retrieve matches
    const matchesRes = await request(app.getHttpServer())
      .get(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const matches = matchesRes.body;
    console.log('--- GENERATED MATCHES ---');
    matches.forEach((m: any) => {
      console.log(
        `Match ID: ${m.id}, Home: ${m.homeTeam?.name || 'TBD'} (${m.homeTeamId}), Away: ${m.awayTeam?.name || 'TBD'} (${m.awayTeamId}), Round: ${m.config?.round}`,
      );
    });
    console.log('-------------------------');

    // Group stage matches should have defined team IDs, and each unique team should appear in only one group
    const groupMatches = matches.filter((m: any) =>
      m.config?.round?.startsWith('Group'),
    );
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

    console.log(
      'Group Teams Map:',
      Array.from(groupTeamsMap.entries()).map(([k, v]) => [k, Array.from(v)]),
    );

    // Verify groups have unique teams (no overlap between Group A and Group B)
    const groupA = groupTeamsMap.get('Group A') || new Set();
    const groupB = groupTeamsMap.get('Group B') || new Set();

    expect(groupA.size).toBe(2);
    expect(groupB.size).toBe(2);

    const intersection = new Set([...groupA].filter((x) => groupB.has(x)));
    expect(intersection.size).toBe(0);

    // 4. Complete a match in Group A and verify that Group B matches are NOT changed
    const groupAMatch = groupMatches.find(
      (m: any) => m.config.round === 'Group A',
    );
    expect(groupAMatch).toBeDefined();

    const originalGroupBMatches = groupMatches.filter(
      (m: any) => m.config.round === 'Group B',
    );
    const originalGroupBTeamIds = originalGroupBMatches.map((m: any) => [
      m.homeTeamId,
      m.awayTeamId,
    ]);

    // Update match in Group A to completed
    await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${groupAMatch.id}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 3,
        awayScore: 1,
        liveData: { result: 'Home Win' },
      })
      .expect(200);

    // Retrieve matches again and check Group B matches have not changed
    const matchesResAfter = await request(app.getHttpServer())
      .get(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const groupBMatchesAfter = matchesResAfter.body.filter(
      (m: any) => m.config.round === 'Group B',
    );
    const groupBTeamIdsAfter = groupBMatchesAfter.map((m: any) => [
      m.homeTeamId,
      m.awayTeamId,
    ]);

    expect(groupBTeamIdsAfter).toEqual(originalGroupBTeamIds);

    // 5. Complete Group B match and verify the winners are promoted to the Final
    const groupBMatch = groupMatches.find(
      (m: any) => m.config.round === 'Group B',
    );
    expect(groupBMatch).toBeDefined();

    // Complete the Group B match with Away Win (so the away team wins Group B)
    await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${groupBMatch.id}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 1,
        awayScore: 3,
        liveData: { result: 'Away Win' },
      })
      .expect(200);

    // Retrieve all matches to see if the Final match has been updated with the winners
    const finalRes = await request(app.getHttpServer())
      .get(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const finalMatch = finalRes.body.find(
      (m: any) => m.config?.round === 'Final',
    );
    expect(finalMatch).toBeDefined();

    // Winner of Group A is the home team of the completed Group A match
    const winnerGroupA = groupAMatch.homeTeamId;
    // Winner of Group B is the away team of the completed Group B match (since awayScore was 3 vs 1)
    const winnerGroupB = groupBMatch.awayTeamId;

    expect(finalMatch.homeTeamId).toBe(winnerGroupA);
    expect(finalMatch.awayTeamId).toBe(winnerGroupB);

    const thirdMatch = finalRes.body.find(
      (m: any) => m.config?.round === 'Third Place Match',
    );
    expect(thirdMatch).toBeDefined();
    expect(thirdMatch.homeTeamId).toBe(groupAMatch.awayTeamId); // Group A runner-up (Team 4)
    expect(thirdMatch.awayTeamId).toBe(groupBMatch.homeTeamId); // Group B runner-up (Team 1)

    // 6. Set competition pointsConfig
    await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        pointsConfig: [
          { position: 1, label: 'Winner', points: 10 },
          { position: 2, label: 'Runner-up', points: 5 },
        ],
      })
      .expect(200);

    // Complete Third Place Match
    await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${thirdMatch.id}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 1,
        awayScore: 0,
      })
      .expect(200);

    // 7. Complete the Final match (Group A winner wins, Group B winner loses)
    await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${finalMatch.id}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 2,
        awayScore: 0,
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
      .post(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${koCompId}/stages`,
      )
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
      .post(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${koCompId}/generate-fixtures`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(201);

    // 4. Retrieve matches
    const matchesRes = await request(app.getHttpServer())
      .get(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${koCompId}/stages/${koStageId}/matches`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const matches = matchesRes.body;

    // There should be 2 Semi-Finals, 1 Final, and 1 Third Place Match
    const semiFinals = matches.filter(
      (m: any) => m.config?.round === 'Semi-Final',
    );
    const finalMatch = matches.find((m: any) => m.config?.round === 'Final');
    const thirdMatch = matches.find(
      (m: any) => m.config?.round === 'Third Place Match',
    );

    expect(semiFinals.length).toBe(2);
    expect(finalMatch).toBeDefined();
    expect(thirdMatch).toBeDefined();

    // 5. Complete Semi-Final 1 (Team 1 vs Team 2 -> Team 1 wins, Team 2 loses)
    const sf1 = semiFinals[0];
    await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${koCompId}/stages/${koStageId}/matches/${sf1.id}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 3,
        awayScore: 1,
        liveData: { result: 'Home Win' },
      })
      .expect(200);

    // 6. Complete Semi-Final 2 (Team 3 vs Team 4 -> Team 4 wins, Team 3 loses)
    const sf2 = semiFinals[1];
    await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${koCompId}/stages/${koStageId}/matches/${sf2.id}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 1,
        awayScore: 2,
        liveData: { result: 'Away Win' },
      })
      .expect(200);

    // 7. Verify the winners advanced to the Final, and losers to the Third Place Match
    const matchesAfterSFRes = await request(app.getHttpServer())
      .get(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${koCompId}/stages/${koStageId}/matches`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const updatedFinal = matchesAfterSFRes.body.find(
      (m: any) => m.id === finalMatch.id,
    );
    const updatedThird = matchesAfterSFRes.body.find(
      (m: any) => m.id === thirdMatch.id,
    );

    const sf1Winner = sf1.homeTeamId;
    const sf1Loser = sf1.awayTeamId;
    const sf2Winner = sf2.awayTeamId;
    const sf2Loser = sf2.homeTeamId;

    expect([sf1Winner, sf2Winner]).toContain(updatedFinal.homeTeamId);
    expect([sf1Winner, sf2Winner]).toContain(updatedFinal.awayTeamId);
    expect(updatedFinal.homeTeamId).not.toBe(updatedFinal.awayTeamId);

    expect([sf1Loser, sf2Loser]).toContain(updatedThird.homeTeamId);
    expect([sf1Loser, sf2Loser]).toContain(updatedThird.awayTeamId);
    expect(updatedThird.homeTeamId).not.toBe(updatedThird.awayTeamId);
  });

  it('should generate fixtures and advance teams correctly for double elimination stage with 4 teams', async () => {
    // 1. Create a new competition for double elimination
    const deCompRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/events/${eventId}/competitions`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Double Elimination Competition',
        sportId: sportId,
        status: 'upcoming',
      })
      .expect(201);
    const deCompId = deCompRes.body.id;

    // 2. Create a stage of type double_elimination
    const deStageRes = await request(app.getHttpServer())
      .post(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${deCompId}/stages`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Double Elimination Stage',
        type: 'double_elimination',
        sequence: 1,
        config: {
          bracketReset: true,
          seeded: false,
        },
      })
      .expect(201);
    const deStageId = deStageRes.body.id;

    // 3. Generate fixtures
    await request(app.getHttpServer())
      .post(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${deCompId}/generate-fixtures`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(201);

    // 4. Retrieve matches
    const matchesRes = await request(app.getHttpServer())
      .get(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${deCompId}/stages/${deStageId}/matches`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const matches = matchesRes.body;

    const sf1 = matches.find(
      (m: any) =>
        m.config?.bracket === 'winner' &&
        m.config?.round === 'WB Semi-Final' &&
        m.config?.matchSlot === 0,
    );
    const sf2 = matches.find(
      (m: any) =>
        m.config?.bracket === 'winner' &&
        m.config?.round === 'WB Semi-Final' &&
        m.config?.matchSlot === 1,
    );
    const wbFinal = matches.find(
      (m: any) =>
        m.config?.bracket === 'winner' && m.config?.round === 'WB Final',
    );
    const lbSemiFinal = matches.find(
      (m: any) =>
        m.config?.bracket === 'loser' && m.config?.round === 'LB Semi-Final',
    );
    const lbFinal = matches.find(
      (m: any) =>
        m.config?.bracket === 'loser' && m.config?.round === 'LB Final',
    );
    const gf = matches.find((m: any) => m.config?.bracket === 'grand_final');
    const reset = matches.find(
      (m: any) => m.config?.bracket === 'grand_final_reset',
    );

    expect(sf1).toBeDefined();
    expect(sf2).toBeDefined();
    expect(wbFinal).toBeDefined();
    expect(lbSemiFinal).toBeDefined();
    expect(lbFinal).toBeDefined();
    expect(gf).toBeDefined();
    expect(reset).toBeDefined();
    expect(reset.status).toBe('inactive');

    // Complete WB Semi-Final 1 (Team 1 vs Team 2 -> Team 1 wins, Team 2 drops)
    await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${deCompId}/stages/${deStageId}/matches/${sf1.id}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 3,
        awayScore: 1,
      })
      .expect(200);

    // Complete WB Semi-Final 2 (Team 3 vs Team 4 -> Team 3 wins, Team 4 drops)
    await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${deCompId}/stages/${deStageId}/matches/${sf2.id}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 3,
        awayScore: 1,
      })
      .expect(200);

    // Verify WB Final & LB Semi-Final matches have the correct teams
    const matchesAfterSFs = await request(app.getHttpServer())
      .get(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${deCompId}/stages/${deStageId}/matches`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const updatedWbFinal = matchesAfterSFs.body.find(
      (m: any) => m.id === wbFinal.id,
    );
    const updatedLbSemiFinal = matchesAfterSFs.body.find(
      (m: any) => m.id === lbSemiFinal.id,
    );

    expect(updatedWbFinal.homeTeamId).toBe(sf1.homeTeamId); // Winner SF1 (Team 1)
    expect(updatedWbFinal.awayTeamId).toBe(sf2.homeTeamId); // Winner SF2 (Team 3)
    expect(updatedLbSemiFinal.homeTeamId).toBe(sf1.awayTeamId); // Loser SF1 (Team 2)
    expect(updatedLbSemiFinal.awayTeamId).toBe(sf2.awayTeamId); // Loser SF2 (Team 4)

    // Complete LB Semi-Final (Team 2 vs Team 4 -> Team 2 wins)
    await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${deCompId}/stages/${deStageId}/matches/${updatedLbSemiFinal.id}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 2,
        awayScore: 0,
      })
      .expect(200);

    // Complete WB Final (Team 1 vs Team 3 -> Team 1 wins, Team 3 drops)
    await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${deCompId}/stages/${deStageId}/matches/${updatedWbFinal.id}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 2,
        awayScore: 1,
      })
      .expect(200);

    // Verify LB Final & Grand Final have the correct teams
    const matchesAfterWbFinal = await request(app.getHttpServer())
      .get(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${deCompId}/stages/${deStageId}/matches`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const updatedLbFinal = matchesAfterWbFinal.body.find(
      (m: any) => m.id === lbFinal.id,
    );
    const updatedGf = matchesAfterWbFinal.body.find((m: any) => m.id === gf.id);

    expect(updatedLbFinal.homeTeamId).toBe(updatedLbSemiFinal.homeTeamId); // Winner LB Semi-Final (Team 2)
    expect(updatedLbFinal.awayTeamId).toBe(updatedWbFinal.awayTeamId); // Loser WB Final (Team 3)
    expect(updatedGf.homeTeamId).toBe(updatedWbFinal.homeTeamId); // Winner WB Final (Team 1)

    // Complete LB Final (Team 2 vs Team 3 -> Team 2 wins)
    await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${deCompId}/stages/${deStageId}/matches/${updatedLbFinal.id}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 2,
        awayScore: 1,
      })
      .expect(200);

    // Verify Grand Final is updated with LB winner
    const matchesAfterLbFinal = await request(app.getHttpServer())
      .get(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${deCompId}/stages/${deStageId}/matches`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const updatedGf2 = matchesAfterLbFinal.body.find(
      (m: any) => m.id === gf.id,
    );
    expect(updatedGf2.awayTeamId).toBe(updatedLbFinal.homeTeamId); // Winner LB Final (Team 2)

    // Complete Grand Final (Team 1 vs Team 2 -> Team 2 wins, triggering reset)
    await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${deCompId}/stages/${deStageId}/matches/${updatedGf2.id}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 0,
        awayScore: 1,
      })
      .expect(200);

    // Verify Grand Final Reset is now scheduled and has teams populated
    const matchesAfterGf = await request(app.getHttpServer())
      .get(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${deCompId}/stages/${deStageId}/matches`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const updatedReset = matchesAfterGf.body.find(
      (m: any) => m.id === reset.id,
    );
    expect(updatedReset.status).toBe('scheduled');
    expect(updatedReset.homeTeamId).toBe(updatedGf2.homeTeamId); // Team 1
    expect(updatedReset.awayTeamId).toBe(updatedGf2.awayTeamId); // Team 2

    // Complete Grand Final Reset (Team 1 vs Team 2 -> Team 2 wins)
    await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${deCompId}/stages/${deStageId}/matches/${updatedReset.id}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 0,
        awayScore: 2,
      })
      .expect(200);

    // Verify competition is completed
    const deCompFinished = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/events/${eventId}/competitions`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    const finalComp = deCompFinished.body.find((c: any) => c.id === deCompId);
    expect(finalComp.status).toBe('completed');
  });

  it('should generate fixtures and advance teams correctly for swiss stage with 4 teams', async () => {
    // 1. Create a new competition for Swiss
    const swissCompRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/events/${eventId}/competitions`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Swiss Competition',
        sportId: sportId,
        status: 'upcoming',
      })
      .expect(201);
    const swissCompId = swissCompRes.body.id;

    // 2. Create a stage of type swiss
    const swissStageRes = await request(app.getHttpServer())
      .post(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${swissCompId}/stages`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Swiss Stage',
        type: 'swiss',
        sequence: 1,
        config: {
          winPoint: 3,
          drawPoint: 1,
          roundsCount: 2,
          tieBreaks: ['buchholz', 'sonneborn_berger', 'cumulative'],
        },
      })
      .expect(201);
    const swissStageId = swissStageRes.body.id;

    // 3. Generate fixtures (Round 1)
    await request(app.getHttpServer())
      .post(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${swissCompId}/generate-fixtures`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(201);

    // 4. Retrieve matches
    const matchesRes = await request(app.getHttpServer())
      .get(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${swissCompId}/stages/${swissStageId}/matches`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const matches = matchesRes.body;
    expect(matches.length).toBe(2);
    expect(matches[0].config?.swissRound).toBe(1);
    expect(matches[1].config?.swissRound).toBe(1);

    // 5. Complete Round 1 matches
    // Match 1: Home Win
    const m1 = matches[0];
    await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${swissCompId}/stages/${swissStageId}/matches/${m1.id}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 3,
        awayScore: 0,
      })
      .expect(200);

    // Match 2: Home Win
    const m2 = matches[1];
    await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${swissCompId}/stages/${swissStageId}/matches/${m2.id}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 3,
        awayScore: 0,
      })
      .expect(200);

    // 6. Retrieve matches again - Round 2 should have been generated automatically!
    const matchesAfterRes = await request(app.getHttpServer())
      .get(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${swissCompId}/stages/${swissStageId}/matches`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const allMatches = matchesAfterRes.body;
    // Should have 2 matches of round 1 + 2 matches of round 2 = 4 matches total
    expect(allMatches.length).toBe(4);

    const round2Matches = allMatches.filter(
      (m: any) => m.config?.swissRound === 2,
    );
    expect(round2Matches.length).toBe(2);

    // Verify pairings in Round 2:
    // Winners of Round 1 (m1.homeTeamId and m2.homeTeamId) must play each other
    // Losers of Round 1 (m1.awayTeamId and m2.awayTeamId) must play each other
    const winners = [m1.homeTeamId, m2.homeTeamId];
    const losers = [m1.awayTeamId, m2.awayTeamId];

    const matchWinners = round2Matches.find(
      (m: any) =>
        winners.includes(m.homeTeamId) && winners.includes(m.awayTeamId),
    );
    const matchLosers = round2Matches.find(
      (m: any) =>
        losers.includes(m.homeTeamId) && losers.includes(m.awayTeamId),
    );

    expect(matchWinners).toBeDefined();
    expect(matchLosers).toBeDefined();

    // 7. Complete Round 2 matches
    await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${swissCompId}/stages/${swissStageId}/matches/${matchWinners.id}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 2,
        awayScore: 1,
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${swissCompId}/stages/${swissStageId}/matches/${matchLosers.id}`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        status: 'completed',
        homeScore: 2,
        awayScore: 1,
      })
      .expect(200);

    // 8. Verify competition is completed automatically (since Round 2 was the last round)
    const swissCompFinished = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/events/${eventId}/competitions`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    const finalSwissComp = swissCompFinished.body.find(
      (c: any) => c.id === swissCompId,
    );
    expect(finalSwissComp.status).toBe('completed');
  });

  it('should generate fixtures and balance venues/dates correctly for round robin stage', async () => {
    // 1. Create 2 venues for the workspace to verify venue balancing
    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/venues`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ name: 'Court A', location: 'Section 1' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/venues`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ name: 'Court B', location: 'Section 2' })
      .expect(201);

    // 2. Create a competition
    const compRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/events/${eventId}/competitions`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'RR Config Competition',
        sportId: sportId,
        status: 'upcoming',
      })
      .expect(201);
    const compId = compRes.body.id;

    // 3. Create a stage of type league (Round Robin) with restDays config
    const stageRes = await request(app.getHttpServer())
      .post(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${compId}/stages`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'RR Config Stage',
        type: 'league',
        sequence: 1,
        config: {
          winPoint: 3,
          drawPoint: 1,
          twoLegged: true,
          restDays: 2,
        },
      })
      .expect(201);
    const stageId = stageRes.body.id;

    // 4. Generate fixtures
    await request(app.getHttpServer())
      .post(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${compId}/generate-fixtures`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(201);

    // 5. Retrieve matches and verify dates and venues
    const matchesRes = await request(app.getHttpServer())
      .get(
        `/workspaces/${workspaceId}/events/${eventId}/competitions/${compId}/stages/${stageId}/matches`,
      )
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const matches = matchesRes.body;
    expect(matches.length).toBeGreaterThan(0);

    // Check that scheduledAt values exist and rest period is respected between rounds
    const round1Match = matches.find(
      (m: any) => m.config?.round === 'Round 1' && m.config?.leg === 1,
    );
    const round2Match = matches.find(
      (m: any) => m.config?.round === 'Round 2' && m.config?.leg === 1,
    );

    if (round1Match && round2Match) {
      const date1 = new Date(round1Match.scheduledAt);
      const date2 = new Date(round2Match.scheduledAt);
      const diffTime = Math.abs(date2.getTime() - date1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      // With restDays: 2, the gap between Round 1 and Round 2 dates must be exactly 3 days (2 rest days + 1 match day)
      expect(diffDays).toBe(3);
    }

    // Verify venue balancing: check that venues are assigned
    const assignedVenues = matches.map((m: any) => m.venueId).filter(Boolean);
    expect(assignedVenues.length).toBeGreaterThan(0);
  });
});
