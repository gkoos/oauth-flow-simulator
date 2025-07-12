import request from 'supertest';
import { app } from '../../lib/index.js';
import { tokens, refreshTokens, clients, users } from '../../lib/store.js';
import { randomBytes } from 'crypto';

// Helper to create a client and user, and get tokens
async function getTokens() {
  // ...simulate /token flow to get access and refresh tokens...
  // For brevity, assume tokens are created and returned
  // You may need to adjust this for your actual app
  const access_token = randomBytes(32).toString('hex');
  const refresh_token = randomBytes(32).toString('hex');
  tokens[access_token] = { sub: 'user1', aud: 'client1', exp: Date.now() + 3600, scope: 'openid' };
  refreshTokens[refresh_token] = { username: 'user1', clientId: 'client1', scopes: ['openid'], issuedAt: Date.now() };
  return { access_token, refresh_token };
}

const clientAuth = Buffer.from('client1:secret1').toString('base64');

describe('/revoke endpoint', () => {
  beforeEach(() => {
    // Clear and add client as array element
    clients.length = 0;
    clients.push({
      clientId: 'client1',
      clientSecret: 'secret1',
      redirectUris: ['http://localhost/cb'],
      scopes: ['openid'],
      refreshTokenLifetime: 3600000 // 1 hour
    });
    // Clear users array to avoid duplicates
    users.length = 0;
    users.push({ username: 'user1', password: 'test', scopes: ['openid'] });
  });

  test('revoke access token (Basic Auth)', async () => {
    const { access_token } = await getTokens();
    expect(tokens[access_token]).toBeTruthy();
    const res = await request(app)
      .post('/revoke')
      .set('Authorization', `Basic ${clientAuth}`)
      .type('form')
      .send({ token: access_token, token_type_hint: 'access_token' });
    expect(res.status).toBe(200);
    expect(tokens[access_token]).toBeFalsy();
  });

  test('revoke refresh token (Basic Auth)', async () => {
    const { refresh_token } = await getTokens();
    expect(refreshTokens[refresh_token]).toBeTruthy();
    const res = await request(app)
      .post('/revoke')
      .set('Authorization', `Basic ${clientAuth}`)
      .type('form')
      .send({ token: refresh_token, token_type_hint: 'refresh_token' });
    expect(res.status).toBe(200);
    expect(refreshTokens[refresh_token]).toBeFalsy();
  });

  test('revoke access token (client_id/client_secret)', async () => {
    const { access_token } = await getTokens();
    expect(tokens[access_token]).toBeTruthy();
    const res = await request(app)
      .post('/revoke')
      .type('form')
      .send({ token: access_token, token_type_hint: 'access_token', client_id: 'client1', client_secret: 'secret1' });
    expect(res.status).toBe(200);
    expect(tokens[access_token]).toBeFalsy();
  });

  test('revoke refresh token (client_id/client_secret)', async () => {
    const { refresh_token } = await getTokens();
    expect(refreshTokens[refresh_token]).toBeTruthy();
    const res = await request(app)
      .post('/revoke')
      .type('form')
      .send({ token: refresh_token, token_type_hint: 'refresh_token', client_id: 'client1', client_secret: 'secret1' });
    expect(res.status).toBe(200);
    expect(refreshTokens[refresh_token]).toBeFalsy();
  });

  test('revoke non-existent token', async () => {
    const fakeToken = randomBytes(32).toString('hex');
    const res = await request(app)
      .post('/revoke')
      .set('Authorization', `Basic ${clientAuth}`)
      .type('form')
      .send({ token: fakeToken });
    expect(res.status).toBe(200);
    expect(tokens[fakeToken]).toBeFalsy();
    expect(refreshTokens[fakeToken]).toBeFalsy();
  });

  test('revoke with no token_type_hint', async () => {
    const { access_token } = await getTokens();
    expect(tokens[access_token]).toBeTruthy();
    const res = await request(app)
      .post('/revoke')
      .set('Authorization', `Basic ${clientAuth}`)
      .type('form')
      .send({ token: access_token });
    expect(res.status).toBe(200);
    expect(tokens[access_token]).toBeFalsy();
  });

  test('revoke with wrong token_type_hint', async () => {
    const { refresh_token } = await getTokens();
    expect(refreshTokens[refresh_token]).toBeTruthy();
    const res = await request(app)
      .post('/revoke')
      .set('Authorization', `Basic ${clientAuth}`)
      .type('form')
      .send({ token: refresh_token, token_type_hint: 'access_token' });
    expect(res.status).toBe(200);
    // RFC 7009: Should NOT be deleted, since hint is access_token
    expect(refreshTokens[refresh_token]).toBeTruthy();
  });

  test('revoke with missing client authentication', async () => {
    const { access_token } = await getTokens();
    const res = await request(app)
      .post('/revoke')
      .type('form')
      .send({ token: access_token });
    expect(res.status).toBe(401);
    expect(tokens[access_token]).toBeTruthy();
  });

  test('revoke with missing token field', async () => {
    const res = await request(app)
      .post('/revoke')
      .set('Authorization', `Basic ${clientAuth}`)
      .type('form')
      .send({});
    expect(res.status).toBe(400);
  });

  test('revoke already revoked token', async () => {
    const { access_token } = await getTokens();
    await request(app)
      .post('/revoke')
      .set('Authorization', `Basic ${clientAuth}`)
      .type('form')
      .send({ token: access_token });
    // Second revoke
    const res = await request(app)
      .post('/revoke')
      .set('Authorization', `Basic ${clientAuth}`)
      .type('form')
      .send({ token: access_token });
    expect(res.status).toBe(200);
    expect(tokens[access_token]).toBeFalsy();
  });

  test('revoke with malformed request body', async () => {
    const res = await request(app)
      .post('/revoke')
      .set('Authorization', `Basic ${clientAuth}`)
      .send('not a form body');
    expect([400, 415]).toContain(res.status);
  });

  test('revoke with extra fields', async () => {
    const { access_token } = await getTokens();
    expect(tokens[access_token]).toBeTruthy();
    const res = await request(app)
      .post('/revoke')
      .set('Authorization', `Basic ${clientAuth}`)
      .type('form')
      .send({ token: access_token, extra: 'field' });
    expect(res.status).toBe(200);
    expect(tokens[access_token]).toBeFalsy();
  });

  test('revoke token belonging to different client', async () => {
    const { access_token } = await getTokens();
    // Simulate token for client2
    tokens[access_token] = { sub: 'user1', aud: 'client2', exp: Date.now() + 3600, scope: 'openid' };
    const res = await request(app)
      .post('/revoke')
      .set('Authorization', `Basic ${clientAuth}`)
      .type('form')
      .send({ token: access_token });
    expect(res.status).toBe(200);
    // Should not be deleted by client1
    expect(tokens[access_token]).toBeTruthy();
  });
});
