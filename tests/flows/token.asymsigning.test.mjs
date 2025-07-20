// tests/flows/token.asymsigning.test.mjs
import request from 'supertest';
import { app } from '../../lib/index.js';
import * as store from '../../lib/store.js';

describe('OAuth2 asymmetric signing flow', () => {
  let server;
  let baseUrl;
  let agent;
  beforeAll(async () => {
    store.configSigning.asymKeySigning = true;
    server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    agent = request.agent(baseUrl);
  });
  afterAll(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    store.configSigning.asymKeySigning = false;
  });

  it('should issue access token and introspect it with correct values', async () => {
    // Step 1: /authorize
    // Step 1: /authorize
    let res = await agent
      .get('/authorize')
      .query({
        response_type: 'code',
        client_id: 'web-app',
        redirect_uri: 'http://localhost:3000/callback',
        scope: 'openid profile offline_access',
      });
    expect(res.status).toBe(302);
    let location = res.headers.location;
    // Step 2: /login
    if (location.startsWith('/login')) {
      res = await agent.get(location);
      res = await agent
        .post(location)
        .type('form')
        .send({ username: 'alice', password: 'pw123' });
      expect(res.status).toBe(302);
      location = res.headers.location;
    }
    // Step 3: follow /authorize redirect after login
    if (location.startsWith('/authorize')) {
      res = await agent.get(location);
      expect(res.status).toBe(302);
      location = res.headers.location;
    }
    // Step 4: extract code from final callback
    const code = new URL(location, baseUrl).searchParams.get('code');
    expect(code).toBeTruthy();
    // Step 4: exchange code for token
    const tokenRes = await request(baseUrl)
      .post('/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'web-app',
        client_secret: 'shhh',
      });
    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.access_token).toBeDefined();
    // Step 5: introspect access token
    const introspectRes = await request(baseUrl)
      .post('/introspect')
      .type('form')
      .send({
        token: tokenRes.body.access_token,
        token_type_hint: 'access_token',
        client_id: 'web-app',
        client_secret: 'shhh',
      });
    expect(introspectRes.status).toBe(200);
    expect(introspectRes.body.active).toBe(true);
    expect(introspectRes.body.username).toBe('alice');
    expect(introspectRes.body.client_id).toBe('web-app');
    expect(introspectRes.body.token_type).toBe('access_token');
    expect(introspectRes.body.aud).toBe('web-app');
  });

  it('should issue refresh token and introspect it with correct values', async () => {
    // Step 1: /authorize
    // Step 1: /authorize
    let res = await agent
      .get('/authorize')
      .query({
        response_type: 'code',
        client_id: 'web-app',
        redirect_uri: 'http://localhost:3000/callback',
        scope: 'openid profile offline_access',
      });
    expect(res.status).toBe(302);
    let location = res.headers.location;
    // Step 2: /login
    if (location.startsWith('/login')) {
      res = await agent.get(location);
      res = await agent
        .post(location)
        .type('form')
        .send({ username: 'alice', password: 'pw123' });
      expect(res.status).toBe(302);
      location = res.headers.location;
    }
    // Step 3: follow /authorize redirect after login
    if (location.startsWith('/authorize')) {
      res = await agent.get(location);
      expect(res.status).toBe(302);
      location = res.headers.location;
    }
    // Step 4: extract code from final callback
    const code = new URL(location, baseUrl).searchParams.get('code');
    expect(code).toBeTruthy();
    // Step 4: exchange code for token
    const tokenRes = await request(baseUrl)
      .post('/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'web-app',
        client_secret: 'shhh',
      });
    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.refresh_token).toBeDefined();
    // Step 5: introspect refresh token
    const introspectRes = await request(baseUrl)
      .post('/introspect')
      .type('form')
      .send({
        token: tokenRes.body.refresh_token,
        token_type_hint: 'refresh_token',
        client_id: 'web-app',
        client_secret: 'shhh',
      });
    expect(introspectRes.status).toBe(200);
    expect(introspectRes.body.active).toBe(true);
    expect(introspectRes.body.username).toBe('alice');
    expect(introspectRes.body.client_id).toBe('web-app');
    expect(introspectRes.body.token_type).toBe('refresh_token');
    expect(introspectRes.body.aud).toBe('web-app');
  });
});
