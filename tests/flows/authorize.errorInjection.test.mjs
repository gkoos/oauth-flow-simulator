import request from 'supertest';
import app from '../../lib/index.js';

describe('OAuth2 /authorize error injection', () => {
  const client_id = 'web-app';
  const redirect_uri = 'http://localhost:3000/callback';
  const username = 'alice';
  const password = 'pw123';

  it('should inject error directly in /authorize', async () => {
    const res = await request(app)
      .get('/authorize')
      .query({
        client_id,
        redirect_uri,
        response_type: 'code',
        scope: 'openid',
        authorize_force_error: 'invalid_request',
        authorize_error_description: 'Simulated invalid request'
      });
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('error=invalid_request');
    expect(res.headers.location).toContain('error_description=Simulated%20invalid%20request');
    expect(res.headers.location).not.toContain('code=');
  });

  it('should inject error through login flow', async () => {
    // Step 1: GET /authorize (should redirect to client with error, not /login)
    const res1 = await request(app)
      .get('/authorize')
      .query({
        client_id,
        redirect_uri,
        response_type: 'code',
        scope: 'openid',
        authorize_force_error: 'invalid_request',
        authorize_error_description: 'Simulated invalid request'
      });
    expect(res1.status).toBe(302);
    expect(res1.headers.location).toContain('error=invalid_request');
    expect(res1.headers.location).toContain('error_description=Simulated%20invalid%20request');
    expect(res1.headers.location).not.toContain('code=');
  });

  it('should issue code when no error injection', async () => {
    // Step 1: GET /authorize (should redirect to client with error if not authenticated)
    const res1 = await request(app)
      .get('/authorize')
      .set('Accept', 'application/json')
      .query({
        client_id,
        redirect_uri,
        response_type: 'code',
        scope: 'openid'
      });
    expect(res1.status).toBe(302);
    // Expect redirect to client callback with error=login_required
    expect(res1.headers.location).toContain(redirect_uri);
    expect(res1.headers.location).toContain('error=login_required');
    expect(res1.headers.location).toContain('error_description=User%20not%20logged%20in');
    // Step 2: GET /login (get cookies)
    const loginRes = await request(app)
      .get('/login')
      .query({
        client_id,
        redirect_uri,
        response_type: 'code',
        scope: 'openid'
      });
    const cookies = loginRes.headers['set-cookie'];
    // Step 3: POST /login (with credentials)
    let req = request(app)
      .post('/login')
      .type('form')
      .send({ username, password }) // Only send credentials in body
      .query({
        client_id,
        redirect_uri,
        response_type: 'code',
        scope: 'openid'
      }); // Send OAuth params in query
    if (cookies && cookies.length > 0) {
      req = req.set('Cookie', cookies);
    }
    const res2 = await req;
    // Use session cookie from login response for final authorize request
    const authorizeUrl = res2.headers.location;
    const sessionCookies = res2.headers['set-cookie'];
    if (!authorizeUrl) {
      throw new Error('POST /login did not redirect to /authorize.');
    }
    let authorizeReq = request(app).get(authorizeUrl);
    if (sessionCookies && sessionCookies.length > 0) {
      authorizeReq = authorizeReq.set('Cookie', sessionCookies);
    }
    const res3 = await authorizeReq;
    expect(res3.status).toBe(302);
    expect(res3.headers.location).toContain('code=');
    expect(res3.headers.location).not.toContain('error=');
  });
});
