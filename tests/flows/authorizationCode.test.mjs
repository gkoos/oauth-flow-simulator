import request from 'supertest';
import { app } from '../../lib/index.js';

describe('/authorize endpoint', () => {
  it('redirects with code and state for valid request', async () => {
    const agent = request.agent(app);
    // Simulate login
    await agent
      .post('/login')
      .send({ username: 'alice', password: 'pw123' });
    const res = await agent
      .get('/authorize')
      .query({
        response_type: 'code',
        client_id: 'web-app',
        redirect_uri: 'http://localhost:3000/callback',
        scope: 'openid',
        state: 'xyz',
      });
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/code=/);
    expect(res.headers.location).toMatch(/state=xyz/);
  });

  it('redirects to error for unsupported response_type', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({ username: 'alice', password: 'pw123' });
    const res = await agent
      .get('/authorize')
      .query({
        response_type: 'token',
        client_id: 'web-app',
        redirect_uri: 'http://localhost:3000/callback',
        scope: 'openid',
        state: 'xyz',
      });
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/unsupported_response_type/);
  });

  it('redirects to error for invalid client', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({ username: 'alice', password: 'pw123' });
    const res = await agent
      .get('/authorize')
      .query({
        response_type: 'code',
        client_id: 'bad-client',
        redirect_uri: 'http://localhost:3000/callback',
        scope: 'openid',
        state: 'xyz',
      });
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/invalid_client/);
  });

  it('redirects to error for invalid redirect uri', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({ username: 'alice', password: 'pw123' });
    const res = await agent
      .get('/authorize')
      .query({
        response_type: 'code',
        client_id: 'web-app',
        redirect_uri: 'http://localhost:3000/invalid',
        scope: 'openid',
        state: 'xyz',
      });
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/invalid_redirect_uri/);
  });

  it('redirects to error for completely invalid scope', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({ username: 'alice', password: 'pw123' });
    const res = await agent
      .get('/authorize')
      .query({
        response_type: 'code',
        client_id: 'web-app',
        redirect_uri: 'http://localhost:3000/callback',
        scope: 'invalidscope',
        state: 'xyz',
      });
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/invalid_scope/);
  });

  it('redirects to error for partially invalid scopes', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({ username: 'alice', password: 'pw123' });
    const res = await agent
      .get('/authorize')
      .query({
        response_type: 'code',
        client_id: 'web-app',
        redirect_uri: 'http://localhost:3000/callback',
        scope: 'openid email',
        state: 'xyz',
      });
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/invalid_scope/);
  });

  it('accepts valid scopes', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({ username: 'alice', password: 'pw123' });
    const res = await agent
      .get('/authorize')
      .query({
        response_type: 'code',
        client_id: 'web-app',
        redirect_uri: 'http://localhost:3000/callback',
        scope: 'openid profile',
        state: 'xyz',
      });
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/code=/);
  });
});

describe('Consent flow', () => {
  const client1 = {
    clientId: 'clientA',
    clientSecret: 'secretA',
    redirectUris: ['http://localhost:3000/callback'],
    scopes: [
      { name: 'email', description: 'Email', consentNeeded: true }
    ]
  };
  const client2 = {
    clientId: 'clientB',
    clientSecret: 'secretB',
    redirectUris: ['http://localhost:3000/callback'],
    scopes: [
      { name: 'email', description: 'Email', consentNeeded: true }
    ]
  };
  beforeAll(async () => {
    // Add clients via API
    await request(app).post('/sim/clients').send(client1);
    await request(app).post('/sim/clients').send(client2);
  });
  it('login redirects to consent page', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({ username: 'alice', password: 'pw123' });
    const res = await agent.get('/authorize').query({
      response_type: 'code',
      client_id: client1.clientId,
      redirect_uri: client1.redirectUris[0],
      scope: 'email',
      state: 'xyz',
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/consent/);
  });
  it('deny consent redirects to callback_uri with error', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({ username: 'alice', password: 'pw123' });
    // Go to consent page
    await agent.get('/authorize').query({
      response_type: 'code',
      client_id: client1.clientId,
      redirect_uri: client1.redirectUris[0],
      scope: 'email',
      state: 'xyz',
    });
    // Deny consent
    const res = await agent.post('/consent').send({
      client_id: client1.clientId,
      redirect_uri: client1.redirectUris[0],
      state: 'xyz',
      action: 'reject',
      scope: 'email',
      response_type: 'code'
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/error=access_denied/);
  });
  it('allow consent continues the flow', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({ username: 'alice', password: 'pw123' });
    // Go to consent page
    await agent.get('/authorize').query({
      response_type: 'code',
      client_id: client1.clientId,
      redirect_uri: client1.redirectUris[0],
      scope: 'email',
      state: 'xyz',
    });
    // Allow consent
    const res = await agent.post('/consent').send({
      client_id: client1.clientId,
      redirect_uri: client1.redirectUris[0],
      state: 'xyz',
      action: 'accept',
      scope: 'email',
      response_type: 'code'
    });
    expect(res.status).toBe(302);
    // Should redirect to callback URI with code
    expect(res.headers.location).toMatch(new RegExp(
      `^${client1.redirectUris[0].replace(/\//g, '\\/')}\?`));
    expect(res.headers.location).toMatch(/code=/);
  });
  it('deny, logout, login again shows consent page again', async () => {
    // Create a unique user for this test
    const testUser = {
      username: 'alice_' + Math.random().toString(36).slice(2, 10),
      password: 'pw123'
    };
    await request(app).post('/sim/users').send(testUser);
    const agent = request.agent(app);
    await agent.post('/login').send({ username: testUser.username, password: testUser.password });
    await agent.get('/authorize').query({
      response_type: 'code',
      client_id: client1.clientId,
      redirect_uri: client1.redirectUris[0],
      scope: 'email',
      state: 'xyz',
    });
    await agent.post('/consent').send({
      client_id: client1.clientId,
      redirect_uri: client1.redirectUris[0],
      state: 'xyz',
      action: 'reject',
      scope: 'email',
      response_type: 'code'
    });
    await agent.get('/logout');
    await agent.post('/login').send({ username: testUser.username, password: testUser.password });
    const res = await agent.get('/authorize').query({
      response_type: 'code',
      client_id: client1.clientId,
      redirect_uri: client1.redirectUris[0],
      scope: 'email',
      state: 'xyz',
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/consent/);
  });
  it('allow, logout, login again skips consent page', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({ username: 'alice', password: 'pw123' });
    await agent.get('/authorize').query({
      response_type: 'code',
      client_id: client1.clientId,
      redirect_uri: client1.redirectUris[0],
      scope: 'email',
      state: 'xyz',
    });
    await agent.post('/consent').send({
      client_id: client1.clientId,
      redirect_uri: client1.redirectUris[0],
      state: 'xyz',
      action: 'accept',
      scope: 'email',
      response_type: 'code'
    });
    await agent.get('/logout');
    await agent.post('/login').send({ username: 'alice', password: 'pw123' });
    const res = await agent.get('/authorize').query({
      response_type: 'code',
      client_id: client1.clientId,
      redirect_uri: client1.redirectUris[0],
      scope: 'email',
      state: 'xyz',
    });
    expect(res.status).toBe(302);
    // Should redirect to callback URI with code
    expect(res.headers.location).toMatch(new RegExp(
      `^${client1.redirectUris[0].replace(/\//g, '\\/')}\?`));
    expect(res.headers.location).toMatch(/code=/);
  });
  it('multiple clients: consent is per client', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({ username: 'alice', password: 'pw123' });
    // Allow consent for client1
    await agent.get('/authorize').query({
      response_type: 'code',
      client_id: client1.clientId,
      redirect_uri: client1.redirectUris[0],
      scope: 'email',
      state: 'xyz',
    });
    await agent.post('/consent').send({
      client_id: client1.clientId,
      redirect_uri: client1.redirectUris[0],
      state: 'xyz',
      action: 'accept',
      scope: 'email',
      response_type: 'code'
    });
    // Now try client2, should show consent page
    const res = await agent.get('/authorize').query({
      response_type: 'code',
      client_id: client2.clientId,
      redirect_uri: client2.redirectUris[0],
      scope: 'email',
      state: 'xyz',
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/consent/);
  });
  it('new scope triggers consent', async () => {
    // Add new scope to client1
    await request(app).put(`/sim/clients/${client1.clientId}`).send({
      scopes: [
        { name: 'email', description: 'Email', consentNeeded: true },
        { name: 'profile', description: 'Profile', consentNeeded: true }
      ]
    });
    const agent = request.agent(app);
    await agent.post('/login').send({ username: 'alice', password: 'pw123' });
    // Already allowed email, now request both
    const res = await agent.get('/authorize').query({
      response_type: 'code',
      client_id: client1.clientId,
      redirect_uri: client1.redirectUris[0],
      scope: 'email profile',
      state: 'xyz',
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/consent/);
  });
});
