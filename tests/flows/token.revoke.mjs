import test from 'ava';
import request from 'supertest';
import app from '../../lib/index.js';
import { tokens, refreshTokens } from '../../lib/store.js';
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

// Happy path: revoke access token (Basic Auth)
test('revoke access token (Basic Auth)', async t => {
  const { access_token } = await getTokens();
  t.truthy(tokens[access_token]);
  const res = await request(app)
    .post('/revoke')
    .set('Authorization', `Basic ${clientAuth}`)
    .type('form')
    .send({ token: access_token, token_type_hint: 'access_token' });
  t.is(res.status, 200);
  t.falsy(tokens[access_token]);
});

// Happy path: revoke refresh token (Basic Auth)
test('revoke refresh token (Basic Auth)', async t => {
  const { refresh_token } = await getTokens();
  t.truthy(refreshTokens[refresh_token]);
  const res = await request(app)
    .post('/revoke')
    .set('Authorization', `Basic ${clientAuth}`)
    .type('form')
    .send({ token: refresh_token, token_type_hint: 'refresh_token' });
  t.is(res.status, 200);
  t.falsy(refreshTokens[refresh_token]);
});

// Happy path: revoke access token (client_id/client_secret)
test('revoke access token (client_id/client_secret)', async t => {
  const { access_token } = await getTokens();
  t.truthy(tokens[access_token]);
  const res = await request(app)
    .post('/revoke')
    .type('form')
    .send({ token: access_token, token_type_hint: 'access_token', client_id: 'client1', client_secret: 'secret1' });
  t.is(res.status, 200);
  t.falsy(tokens[access_token]);
});

// Happy path: revoke refresh token (client_id/client_secret)
test('revoke refresh token (client_id/client_secret)', async t => {
  const { refresh_token } = await getTokens();
  t.truthy(refreshTokens[refresh_token]);
  const res = await request(app)
    .post('/revoke')
    .type('form')
    .send({ token: refresh_token, token_type_hint: 'refresh_token', client_id: 'client1', client_secret: 'secret1' });
  t.is(res.status, 200);
  t.falsy(refreshTokens[refresh_token]);
});

// Edge: revoke non-existent token
test('revoke non-existent token', async t => {
  const fakeToken = randomBytes(32).toString('hex');
  const res = await request(app)
    .post('/revoke')
    .set('Authorization', `Basic ${clientAuth}`)
    .type('form')
    .send({ token: fakeToken });
  t.is(res.status, 200);
  t.falsy(tokens[fakeToken]);
  t.falsy(refreshTokens[fakeToken]);
});

// Edge: revoke with no token_type_hint
test('revoke with no token_type_hint', async t => {
  const { access_token } = await getTokens();
  t.truthy(tokens[access_token]);
  const res = await request(app)
    .post('/revoke')
    .set('Authorization', `Basic ${clientAuth}`)
    .type('form')
    .send({ token: access_token });
  t.is(res.status, 200);
  t.falsy(tokens[access_token]);
});

// Edge: revoke with wrong token_type_hint
test('revoke with wrong token_type_hint', async t => {
  const { refresh_token } = await getTokens();
  t.truthy(refreshTokens[refresh_token]);
  const res = await request(app)
    .post('/revoke')
    .set('Authorization', `Basic ${clientAuth}`)
    .type('form')
    .send({ token: refresh_token, token_type_hint: 'access_token' });
  t.is(res.status, 200);
  t.falsy(refreshTokens[refresh_token]);
});

// Edge: revoke with missing client authentication
test('revoke with missing client authentication', async t => {
  const { access_token } = await getTokens();
  const res = await request(app)
    .post('/revoke')
    .type('form')
    .send({ token: access_token });
  t.is(res.status, 401);
  t.truthy(tokens[access_token]);
});

// Edge: revoke with missing token field
test('revoke with missing token field', async t => {
  const res = await request(app)
    .post('/revoke')
    .set('Authorization', `Basic ${clientAuth}`)
    .type('form')
    .send({});
  t.is(res.status, 400);
});

// Edge: revoke already revoked token
test('revoke already revoked token', async t => {
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
  t.is(res.status, 200);
  t.falsy(tokens[access_token]);
});

// Edge: revoke with malformed request body
test('revoke with malformed request body', async t => {
  const res = await request(app)
    .post('/revoke')
    .set('Authorization', `Basic ${clientAuth}`)
    .send('not a form body');
  t.true(res.status === 400 || res.status === 415);
});

// Edge: revoke with extra fields
test('revoke with extra fields', async t => {
  const { access_token } = await getTokens();
  t.truthy(tokens[access_token]);
  const res = await request(app)
    .post('/revoke')
    .set('Authorization', `Basic ${clientAuth}`)
    .type('form')
    .send({ token: access_token, extra: 'field' });
  t.is(res.status, 200);
  t.falsy(tokens[access_token]);
});

// Edge: revoke token belonging to different client
test('revoke token belonging to different client', async t => {
  const { access_token } = await getTokens();
  // Simulate token for client2
  tokens[access_token] = { sub: 'user1', aud: 'client2', exp: Date.now() + 3600, scope: 'openid' };
  const res = await request(app)
    .post('/revoke')
    .set('Authorization', `Basic ${clientAuth}`)
    .type('form')
    .send({ token: access_token });
  t.is(res.status, 200);
  // Should not be deleted by client1
  t.truthy(tokens[access_token]);
});
