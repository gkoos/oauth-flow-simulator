import request from 'supertest';
import { startServer } from '../../lib/index.js';

let server;
beforeAll(async () => {
  server = await startServer({ port: 0 });
});
afterAll(() => {
  if (server && server.close) server.close();
});

describe('Integration: /', () => {
  it('GET / returns welcome page', async () => {
    const res = await request(server).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('OAuth Flow Simulator');
  });

  it('GET /login returns login page', async () => {
    const res = await request(server).get('/login');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Login');
  });

  it('GET /404 returns 404 page', async () => {
    const res = await request(server).get('/notfound');
    expect(res.status).toBe(404);
    expect(res.text).toContain('404 Not Found');
  });
});
