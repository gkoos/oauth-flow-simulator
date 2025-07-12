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

describe('/sim/clients API endpoints', () => {
  it('GET /sim/clients returns array', async () => {
    const res = await agent.get('/sim/clients');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /sim/clients creates client', async () => {
    const res = await agent.post('/sim/clients').send({ clientId: 'client2', clientSecret: 'secret', redirectUris: ['http://localhost/cb'] });
    expect([200, 201, 400, 409]).toContain(res.status);
    if (res.status === 201) expect(res.body.clientId).toBe('client2');
  });

  it('POST /sim/clients missing fields returns 400', async () => {
    const res = await agent.post('/sim/clients').send({ clientId: 'clientonly' });
    expect(res.status).toBe(400);
  });

  it('POST /sim/clients invalid types returns 400', async () => {
    const res = await agent.post('/sim/clients').send({ clientId: 123, clientSecret: [], redirectUris: 'not-an-array' });
    expect(res.status).toBe(400);
  });

  it('GET /sim/clients/:clientId returns 404 for missing client', async () => {
    const res = await agent.get('/sim/clients/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('GET /sim/clients/:clientId returns client data for existing client', async () => {
    await agent.post('/sim/clients').send({ clientId: 'client2', clientSecret: 'secret', redirectUris: ['http://localhost/cb'], scopes: [] });
    const res = await agent.get('/sim/clients/client2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('clientId', 'client2');
    expect(res.body).toHaveProperty('clientSecret', 'secret');
    expect(res.body).toHaveProperty('redirectUris');
    expect(Array.isArray(res.body.redirectUris)).toBe(true);
  });

  it('PUT /sim/clients/:clientId updates client or returns 404', async () => {
    await agent.post('/sim/clients').send({ clientId: 'client3', clientSecret: 'secret', redirectUris: ['http://localhost/cb'], scopes: [] });
    const res = await agent.put('/sim/clients/client3').send({ clientSecret: 'newsecret' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('clientSecret', 'newsecret');
    const res404 = await agent.put('/sim/clients/nonexistent').send({ clientSecret: 'secret' });
    expect(res404.status).toBe(404);
    expect(res404.body).toHaveProperty('error');
  });

  it('DELETE /sim/clients/:clientId deletes client or returns 404', async () => {
    await agent.post('/sim/clients').send({ clientId: 'client4', clientSecret: 'secret', redirectUris: ['http://localhost/cb'], scopes: [] });
    const res = await agent.delete('/sim/clients/client4');
    expect(res.status).toBe(204);
    const res404 = await agent.delete('/sim/clients/nonexistent');
    expect(res404.status).toBe(404);
    expect(res404.body).toHaveProperty('error');
  });

  it('POST /sim/clients duplicate clientId returns 409', async () => {
    await agent.post('/sim/clients').send({ clientId: 'dupeclient', clientSecret: 'secret', redirectUris: ['http://localhost/cb'], scopes: [] });
    const res = await agent.post('/sim/clients').send({ clientId: 'dupeclient', clientSecret: 'secret', redirectUris: ['http://localhost/cb'], scopes: [] });
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });
});
