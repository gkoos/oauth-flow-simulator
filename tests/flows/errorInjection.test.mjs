import request from 'supertest';
import app from '../../lib/index.js';

describe('Error Injection Middleware', () => {
  const client_id = 'web-app';
  const redirect_uri = 'http://localhost:3000/callback';
  const scope = 'openid';

  afterEach(async () => {
    // Remove all error injections after each test
    await request(app).delete('/sim/config/errors/all');
    await request(app).delete('/sim/config/errors/authorize');
    await request(app).delete('/sim/config/errors/revoke');
  });

  it('should inject 429 error for /authorize only', async () => {
    await request(app)
      .post('/sim/config/errors')
      .send({ target: '/authorize', error: 'rate_limited', status: 429, error_description: 'Too many requests' });
    const res = await request(app)
      .get('/authorize')
      .query({ client_id, redirect_uri, response_type: 'code', scope });
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(redirect_uri);
    expect(res.headers.location).toContain('error=rate_limited');
    expect(res.headers.location).toContain('error_description=Too%20many%20requests');
  });

  it('should inject 429 error for all endpoints', async () => {
    await request(app)
      .post('/sim/config/errors')
      .send({ target: 'all', error: 'rate_limited', status: 429, error_description: 'Too many requests' });
    const res = await request(app)
      .get('/authorize')
      .query({ client_id, redirect_uri, response_type: 'code', scope });
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(redirect_uri);
    expect(res.headers.location).toContain('error=rate_limited');
    expect(res.headers.location).toContain('error_description=Too%20many%20requests');
  });

  it('should prefer endpoint-specific error over global error', async () => {
    await request(app)
      .post('/sim/config/errors')
      .send({ target: 'all', error: 'server_error', status: 503, error_description: 'Service Unavailable' });
    await request(app)
      .post('/sim/config/errors')
      .send({ target: '/authorize', error: 'rate_limited', status: 429, error_description: 'Too many requests' });
    const res = await request(app)
      .get('/authorize')
      .query({ client_id, redirect_uri, response_type: 'code', scope });
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(redirect_uri);
    expect(res.headers.location).toContain('error=rate_limited');
    expect(res.headers.location).toContain('error_description=Too%20many%20requests');
    expect(res.headers.location).not.toContain('error=server_error');
  });

  it('should inject 429 error for /revoke endpoint', async () => {
    await request(app)
      .post('/sim/config/errors')
      .send({ target: '/revoke', error: 'rate_limited', status: 429, error_description: 'Too many requests' });
    const res = await request(app)
      .post('/revoke')
      .send({ token: 'dummy' });
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ error: 'rate_limited', error_description: 'Too many requests' });
  });
});
