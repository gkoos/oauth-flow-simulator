import request from 'supertest';
import { app } from '../../lib/index.js';
import { refreshTokens } from '../../lib/store.js';

describe('Refresh Token Flow', () => {
  const client = {
    clientId: 'web-app',
    clientSecret: 'shhh',
    redirectUris: ['http://localhost:3000/callback'],
    scopes: [
      { name: 'openid', description: 'OpenID Connect', consentNeeded: false },
      { name: 'offline_access', description: 'Offline access', consentNeeded: false }
    ]
  };
  const user = { username: 'bob', password: 'pw123' };
  beforeAll(async () => {
    await request(app).post('/sim/clients').send(client);
    await request(app).post('/sim/users').send(user);
  });
  it('issues refresh token when offline_access is requested', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send(user);
    // Request authorization
    const authRes = await agent.get('/authorize').query({
      response_type: 'code',
      client_id: client.clientId,
      redirect_uri: client.redirectUris[0],
      scope: 'openid offline_access',
      state: 'xyz',
    });
    // Always direct redirect, no consent needed
    const code = new URL(authRes.headers.location, 'http://localhost').searchParams.get('code');
    const tokenRes = await agent.post('/token').send({
      grant_type: 'authorization_code',
      code,
      redirect_uri: client.redirectUris[0],
      client_id: client.clientId,
      client_secret: client.clientSecret
    });
    if (!tokenRes.body.access_token || !tokenRes.body.refresh_token) {
      console.error('Token response:', tokenRes.body);
    }
    expect(tokenRes.body.access_token).toBeDefined();
    expect(tokenRes.body.refresh_token).toBeDefined();
    // Check store
    const meta = refreshTokens[tokenRes.body.refresh_token];
    expect(meta).toBeDefined();
    expect(meta.username).toBe(user.username);
    expect(meta.clientId).toBe(client.clientId);
    expect(meta.scopes).toContain('offline_access');
    expect(meta.issuedAt).toBeDefined();
  });
  it('does not issue refresh token if offline_access is not requested', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send(user);
    // Request authorization, no consent needed for openid
    const authRes = await agent.get('/authorize').query({
      response_type: 'code',
      client_id: client.clientId,
      redirect_uri: client.redirectUris[0],
      scope: 'openid',
      state: 'xyz',
    });
    const code = new URL(authRes.headers.location, 'http://localhost').searchParams.get('code');
    const tokenRes = await agent.post('/token').send({
      grant_type: 'authorization_code',
      code,
      redirect_uri: client.redirectUris[0],
      client_id: client.clientId,
      client_secret: client.clientSecret
    });
    expect(tokenRes.body.access_token).toBeDefined();
    expect(tokenRes.body.refresh_token).toBeUndefined();
  });
  it('refresh token metadata is correct', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send(user);
    // Request authorization
    const authRes = await agent.get('/authorize').query({
      response_type: 'code',
      client_id: client.clientId,
      redirect_uri: client.redirectUris[0],
      scope: 'openid offline_access',
      state: 'xyz',
    });
    // Always direct redirect, no consent needed
    const code2 = new URL(authRes.headers.location, 'http://localhost').searchParams.get('code');
    const tokenRes = await agent.post('/token').send({
      grant_type: 'authorization_code',
      code: code2,
      redirect_uri: client.redirectUris[0],
      client_id: client.clientId,
      client_secret: client.clientSecret
    });
    if (!tokenRes.body.refresh_token) {
      console.error('Token response:', tokenRes.body);
    }
    const meta = refreshTokens[tokenRes.body.refresh_token];
    expect(meta).toBeDefined();
    expect(meta.username).toBe(user.username);
    expect(meta.clientId).toBe(client.clientId);
    expect(meta.scopes).toContain('offline_access');
    expect(meta.issuedAt).toBeDefined();
  });
});
