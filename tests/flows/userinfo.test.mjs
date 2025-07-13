import request from 'supertest';
import { app, startServer } from '../../lib/index.js';
import assert from 'assert';

let server;
beforeAll(async () => {
  server = await startServer({ port: 4001 });
});
afterAll(() => {
  server.close();
});

describe('/userinfo OIDC flow', () => {
  let agent = request.agent(app);

  it('should return {"sub":"alice"} after login and /authorize', async () => {
    // Step 0: Login as alice
    await agent
      .post('/login')
      .send({ username: 'alice', password: 'pw123' })
      .expect(302);
    // Step 1: Get authorization code
    const authRes = await agent
      .get('/authorize')
      .query({
        client_id: 'web-app',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'openid',
        consent: 'given'
      })
      .expect(302);
    const code = new URL(authRes.headers.location, 'http://localhost:4001').searchParams.get('code');
    // Step 2: Exchange code for token
    const tokenRes = await agent
      .post('/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'web-app',
        client_secret: 'shhh'
      })
      .expect(200);
    const accessToken = tokenRes.body.access_token;
    // Step 3: Call /userinfo
    const userinfoRes = await agent
      .get('/userinfo')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    assert.deepStrictEqual(userinfoRes.body, { sub: 'alice' });
  });

  it('should return {"sub":"alice", "email": "alice@example.com"} after adding email and scope', async () => {
    // Add email to alice
    await agent
      .put('/sim/users/alice')
      .send({ email: 'alice@example.com' })
      .expect(200);
    // Add email scope to client
    await agent
      .put('/sim/clients/web-app')
      .send({
        scopes: [
          { name: 'openid', description: 'OpenID Connect basic scope', consentNeeded: false },
          { name: 'profile', description: 'User profile information', consentNeeded: false },
          { name: 'offline_access', description: 'Offline access', consentNeeded: false },
          { name: 'email', description: 'User email address', consentNeeded: false }
        ]
      })
      .expect(200);
    // Step 0: Login as alice
    await agent
      .post('/login')
      .send({ username: 'alice', password: 'pw123' })
      .expect(302);
    // Get authorization code with openid and email scopes
    const authRes = await agent
      .get('/authorize')
      .query({
        client_id: 'web-app',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'openid email',
        consent: 'given'
      })
      .expect(302);
    const code = new URL(authRes.headers.location, 'http://localhost:4001').searchParams.get('code');
    // Exchange code for token
    const tokenRes = await agent
      .post('/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'web-app',
        client_secret: 'shhh'
      })
      .expect(200);
    const accessToken = tokenRes.body.access_token;
    // Call /userinfo
    const userinfoRes = await agent
      .get('/userinfo')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    assert.strictEqual(userinfoRes.body.sub, 'alice');
    assert.strictEqual(userinfoRes.body.email, 'alice@example.com');
  });

  it('should return 403 if no permitted claims for provided scopes', async () => {
    // Step 0: Login as alice
    await agent
      .post('/login')
      .send({ username: 'alice', password: 'pw123' })
      .expect(302);
    // Step 1: Get authorization code with only offline_access scope
    const authRes = await agent
      .get('/authorize')
      .query({
        client_id: 'web-app',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'offline_access',
        consent: 'given'
      })
      .expect(302);
    const code = new URL(authRes.headers.location, 'http://localhost:4001').searchParams.get('code');
    // Step 2: Exchange code for token
    const tokenRes = await agent
      .post('/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'web-app',
        client_secret: 'shhh'
      })
      .expect(200);
    const accessToken = tokenRes.body.access_token;
    // Step 3: Call /userinfo and expect 403
    await agent
      .get('/userinfo')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });
});
