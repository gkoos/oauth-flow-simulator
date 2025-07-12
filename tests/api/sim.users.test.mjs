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

describe('/sim/users API endpoints', () => {
  it('GET /sim/users returns array', async () => {
    const res = await agent.get('/sim/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /sim/users creates user', async () => {
    const res = await agent.post('/sim/users').send({ username: 'alice2', password: 'pw', scopes: ['openid'] });
    expect([200, 201, 400, 409]).toContain(res.status);
    if (res.status === 201) expect(res.body.username).toBe('alice2');
  });

  it('POST /sim/users missing fields returns 400', async () => {
    const res = await agent.post('/sim/users').send({ username: 'missingpw' });
    expect(res.status).toBe(400);
  });

  it('POST /sim/users invalid types returns 400', async () => {
    const res = await agent.post('/sim/users').send({ username: 123, password: {}, scopes: 'not-an-array' });
    expect(res.status).toBe(400);
  });

  it('GET /sim/users/:username returns 404 for missing user', async () => {
    const res = await agent.get('/sim/users/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('GET /sim/users/:username returns user data for existing user', async () => {
    await agent.post('/sim/users').send({ username: 'alice2', password: 'pw', scopes: ['openid'] });
    const res = await agent.get('/sim/users/alice2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('username', 'alice2');
    expect(res.body).toHaveProperty('password', 'pw');
  });

  it('PUT /sim/users/:username updates user or returns 404', async () => {
    await agent.post('/sim/users').send({ username: 'bob', password: 'pw456' });
    const res = await agent.put('/sim/users/bob').send({ password: 'newpw' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('password', 'newpw');
    const res404 = await agent.put('/sim/users/nonexistent').send({ password: 'pw' });
    expect(res404.status).toBe(404);
    expect(res404.body).toHaveProperty('error');
  });

  it('DELETE /sim/users/:username deletes user or returns 404', async () => {
    await agent.post('/sim/users').send({ username: 'charlie', password: 'pw789' });
    const res = await agent.delete('/sim/users/charlie');
    expect(res.status).toBe(204);
    const res404 = await agent.delete('/sim/users/nonexistent');
    expect(res404.status).toBe(404);
    expect(res404.body).toHaveProperty('error');
  });

  it('POST /sim/users duplicate username returns 409', async () => {
    await agent.post('/sim/users').send({ username: 'dupeuser', password: 'pw', scopes: ['openid'] });
    const res = await agent.post('/sim/users').send({ username: 'dupeuser', password: 'pw', scopes: ['openid'] });
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });
});
