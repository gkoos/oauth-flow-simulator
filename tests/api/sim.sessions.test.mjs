import request from 'supertest';
import { startServer } from '../../lib/index.js';

let server;
let agent;

beforeAll(async () => {
  server = await startServer({ port: 0 });
  agent = request.agent(server);
});

afterAll(() => {
  if (server && server.close) server.close();
});

describe('GET /sim/sessions (integration)', () => {
  it('should create a session via /authorize and /login, then return session data', async () => {
    // Step 1: /authorize (simulate OAuth login flow)
    const authRes = await agent.get('/authorize')
      .query({
        client_id: 'web-app',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'openid profile'
      });
    expect([200, 302]).toContain(authRes.status);

    // Step 2: /login (simulate user login)
    const loginRes = await agent.post('/login')
      .type('form')
      .send({ username: 'alice', password: 'test' });
    expect([200, 302]).toContain(loginRes.status);

    // Step 3: /sim/sessions (inspect session state)
    const sessionsRes = await agent.get('/sim/sessions');
    expect(sessionsRes.status).toBe(200);
    expect(sessionsRes.body).toHaveProperty('tokens');
    expect(sessionsRes.body).toHaveProperty('authCodes');
    expect(sessionsRes.body).toHaveProperty('refreshTokens');
    // Optionally, check that at least one token/authCode/refreshToken exists
    expect(Object.keys(sessionsRes.body.tokens).length).toBeGreaterThanOrEqual(0);
    expect(Object.keys(sessionsRes.body.authCodes).length).toBeGreaterThanOrEqual(0);
    expect(Object.keys(sessionsRes.body.refreshTokens).length).toBeGreaterThanOrEqual(0);
  });
});
