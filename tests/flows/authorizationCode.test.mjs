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
