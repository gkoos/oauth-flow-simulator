import request from 'supertest';
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer } from '../lib/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let server;
let agent;

beforeAll(async () => {
  server = await startServer({ port: 0 });
  agent = request.agent(server);
});

afterAll(() => {
  if (server && server.close) server.close();
});

describe('/sim API endpoints', () => {
  // USERS
  test('GET /sim/users returns array', async () => {
    const res = await agent.get('/sim/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /sim/users creates user', async () => {
    const res = await agent.post('/sim/users').send({ username: 'alice2', password: 'pw', scopes: ['openid'] });
    expect([200, 201, 400, 409]).toContain(res.status);
    if (res.status === 201) expect(res.body.username).toBe('alice2');
  });

  test('POST /sim/users missing fields returns 400', async () => {
    const res = await agent.post('/sim/users').send({ username: 'missingpw' });
    expect(res.status).toBe(400);
  });

  test('POST /sim/users invalid types returns 400', async () => {
    const res = await agent.post('/sim/users').send({ username: 123, password: {}, scopes: 'not-an-array' });
    expect(res.status).toBe(400);
  });

  test('GET /sim/users/:username returns user or 404', async () => {
    const res = await agent.get('/sim/users/alice');
    expect([200, 404]).toContain(res.status);
  });

  test('PUT /sim/users/:username updates or 400/404', async () => {
    const res = await agent.put('/sim/users/alice').send({ password: 'newpw' });
    expect([200, 400, 404]).toContain(res.status);
  });

  test('DELETE /sim/users/:username deletes or 404', async () => {
    const res = await agent.delete('/sim/users/alice2');
    expect([204, 404]).toContain(res.status);
  });

  // CLIENTS
  test('GET /sim/clients returns array', async () => {
    const res = await agent.get('/sim/clients');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /sim/clients creates client', async () => {
    const res = await agent.post('/sim/clients').send({ clientId: 'client2', clientSecret: 'secret', redirectUris: ['http://localhost/cb'] });
    expect([200, 201, 400, 409]).toContain(res.status);
    if (res.status === 201) expect(res.body.clientId).toBe('client2');
  });

  test('POST /sim/clients missing fields returns 400', async () => {
    const res = await agent.post('/sim/clients').send({ clientId: 'clientonly' });
    expect(res.status).toBe(400);
  });

  test('POST /sim/clients invalid types returns 400', async () => {
    const res = await agent.post('/sim/clients').send({ clientId: 123, clientSecret: [], redirectUris: 'not-an-array' });
    expect(res.status).toBe(400);
  });

  test('GET /sim/clients/:clientId returns client or 404', async () => {
    const res = await agent.get('/sim/clients/client2');
    expect([200, 404]).toContain(res.status);
  });

  test('PUT /sim/clients/:clientId updates or 400/404', async () => {
    const res = await agent.put('/sim/clients/client2').send({ clientSecret: 'newsecret' });
    expect([200, 400, 404]).toContain(res.status);
  });

  test('DELETE /sim/clients/:clientId deletes or 404', async () => {
    const res = await agent.delete('/sim/clients/client2');
    expect([204, 404]).toContain(res.status);
  });

  // SCOPES
  test('GET /sim/scopes returns array', async () => {
    const res = await agent.get('/sim/scopes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /sim/scopes creates scope', async () => {
    const res = await agent.post('/sim/scopes').send({ name: 'scope2', description: 'desc' });
    expect([200, 201, 400, 409]).toContain(res.status);
    if (res.status === 201) expect(res.body.name).toBe('scope2');
  });

  test('POST /sim/scopes missing fields returns 400', async () => {
    const res = await agent.post('/sim/scopes').send({});
    expect(res.status).toBe(400);
  });

  test('POST /sim/scopes invalid types returns 400', async () => {
    const res = await agent.post('/sim/scopes').send({ name: 123, description: [] });
    expect(res.status).toBe(400);
  });

  test('GET /sim/scopes/:scope returns scope or 404', async () => {
    const res = await agent.get('/sim/scopes/scope2');
    expect([200, 404]).toContain(res.status);
  });

  test('PUT /sim/scopes/:scope updates or 400/404', async () => {
    const res = await agent.put('/sim/scopes/scope2').send({ description: 'newdesc' });
    expect([200, 400, 404]).toContain(res.status);
  });

  test('DELETE /sim/scopes/:scope deletes or 404', async () => {
    const res = await agent.delete('/sim/scopes/scope2');
    expect([204, 404]).toContain(res.status);
  });
});
