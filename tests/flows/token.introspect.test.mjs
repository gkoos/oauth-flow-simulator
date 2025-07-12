import request from 'supertest';
import { app } from '../../lib/index.js';
import { tokens, refreshTokens, clients, users } from '../../lib/store.js';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

// Helper to create a client and user, and get tokens
async function getTokens() {
  const secret = process.env.JWT_SECRET || 'dev_secret';
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: 'user1',
    aud: 'client1',
    exp: now + 3600,
    scope: 'openid'
  };
  const access_token = jwt.sign(payload, secret);
  const refresh_token = randomBytes(32).toString('hex');
  tokens[access_token] = { ...payload };
  refreshTokens[refresh_token] = { username: 'user1', clientId: 'client1', scopes: ['openid'], issuedAt: Date.now(), expiresAt: Date.now() + 3600000 };
  return { access_token, refresh_token };
}

const clientAuth = Buffer.from('client1:secret1').toString('base64');

describe('/introspect endpoint', () => {
  beforeEach(() => {
    clients.length = 0;
    clients.push({
      clientId: 'client1',
      clientSecret: 'secret1',
      redirectUris: ['http://localhost/cb'],
      scopes: [{ name: 'openid', description: '', consentNeeded: false }],
      refreshTokenLifetime: 3600000
    });
    users.length = 0;
    users.push({ username: 'user1', password: 'test', scopes: ['openid'] });
  });

  test('introspect access token (Basic Auth)', async () => {
    const { access_token } = await getTokens();
    const res = await request(app)
      .post('/introspect')
      .set('Authorization', `Basic ${clientAuth}`)
      .type('form')
      .send({ token: access_token });
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(true);
    expect(res.body.token_type).toBe('access_token');
    expect(res.body.client_id).toBe('client1');
    expect(res.body.username).toBe('user1');
    expect(res.body.scope).toBe('openid');
  });

  test('introspect refresh token (Basic Auth)', async () => {
    const { refresh_token } = await getTokens();
    const res = await request(app)
      .post('/introspect')
      .set('Authorization', `Basic ${clientAuth}`)
      .type('form')
      .send({ token: refresh_token });
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(true);
    expect(res.body.token_type).toBe('refresh_token');
    expect(res.body.client_id).toBe('client1');
    expect(res.body.username).toBe('user1');
    expect(res.body.scope).toBe('openid');
  });

  test('introspect access token (client_id/client_secret in body)', async () => {
    const { access_token } = await getTokens();
    const res = await request(app)
      .post('/introspect')
      .type('form')
      .send({ token: access_token, client_id: 'client1', client_secret: 'secret1' });
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(true);
    expect(res.body.token_type).toBe('access_token');
  });

  test('introspect invalid token', async () => {
    const res = await request(app)
      .post('/introspect')
      .set('Authorization', `Basic ${clientAuth}`)
      .type('form')
      .send({ token: 'not_a_token' });
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
  });

  test('introspect expired refresh token', async () => {
    const refresh_token = randomBytes(32).toString('hex');
    refreshTokens[refresh_token] = { username: 'user1', clientId: 'client1', scopes: ['openid'], issuedAt: Date.now() - 7200000, expiresAt: Date.now() - 3600000 };
    const res = await request(app)
      .post('/introspect')
      .set('Authorization', `Basic ${clientAuth}`)
      .type('form')
      .send({ token: refresh_token });
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
  });

  test('introspect with missing client authentication', async () => {
    const { access_token } = await getTokens();
    const res = await request(app)
      .post('/introspect')
      .type('form')
      .send({ token: access_token });
    expect(res.status).toBe(401);
  });

  test('introspect with missing token field', async () => {
    const res = await request(app)
      .post('/introspect')
      .set('Authorization', `Basic ${clientAuth}`)
      .type('form')
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
  });
});
